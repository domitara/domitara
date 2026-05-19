package scheduler

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/robfig/cron/v3"
)

type reminderDef struct {
	key   string
	title string
	body  string
	tone  string
	check func(ctx context.Context, pool *pgxpool.Pool) (bool, error)
}

var definitions = []reminderDef{
	{
		key:   "no_items",
		title: "Add items to track",
		body:  "Maintenance logs are linked to inventory items",
		tone:  "info",
		check: func(ctx context.Context, pool *pgxpool.Pool) (bool, error) {
			var n int
			err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM items`).Scan(&n)
			return n == 0, err
		},
	},
	{
		key:   "no_maintenance",
		title: "Set up maintenance schedules",
		body:  "Log your first maintenance to start tracking",
		tone:  "info",
		check: func(ctx context.Context, pool *pgxpool.Pool) (bool, error) {
			var n int
			err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM maintenance_logs`).Scan(&n)
			return n == 0, err
		},
	},
	{
		key:   "items_no_photos",
		title: "Add photos to your items",
		body:  "Items with photos are easier to identify",
		tone:  "info",
		check: func(ctx context.Context, pool *pgxpool.Pool) (bool, error) {
			var n int
			err := pool.QueryRow(ctx, `
				SELECT COUNT(*) FROM items i
				WHERE NOT EXISTS (SELECT 1 FROM item_photos p WHERE p.item_id = i.id)
			`).Scan(&n)
			return n > 0, err
		},
	},
	{
		key:   "high_value_uninsured",
		title: "Mark high-value items insured",
		body:  "Track insurance for expensive possessions",
		tone:  "warn",
		check: func(ctx context.Context, pool *pgxpool.Pool) (bool, error) {
			var n int
			err := pool.QueryRow(ctx, `
				SELECT COUNT(*) FROM items
				WHERE purchase_price > 500 AND insured = false
			`).Scan(&n)
			return n > 0, err
		},
	},
}

type Scheduler struct {
	pool *pgxpool.Pool
	c    *cron.Cron
}

func New(pool *pgxpool.Pool) *Scheduler {
	return &Scheduler{pool: pool, c: cron.New()}
}

func (s *Scheduler) Start() {
	go s.run()
	s.c.AddFunc("@daily", s.run)
	s.c.Start()
}

func (s *Scheduler) Stop() {
	s.c.Stop()
}

func (s *Scheduler) run() {
	ctx := context.Background()

	rows, err := s.pool.Query(ctx, `SELECT id FROM users`)
	if err != nil {
		log.Printf("scheduler: list users: %v", err)
		return
	}
	var userIDs []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			log.Printf("scheduler: scan user: %v", err)
			rows.Close()
			return
		}
		userIDs = append(userIDs, id)
	}
	rows.Close()

	for _, def := range definitions {
		active, err := def.check(ctx, s.pool)
		if err != nil {
			log.Printf("scheduler: check %s: %v", def.key, err)
			continue
		}

		for _, uid := range userIDs {
			if active {
				_, err = s.pool.Exec(ctx, `
					INSERT INTO reminders (user_id, key, title, body, tone)
					VALUES ($1, $2, $3, $4, $5)
					ON CONFLICT (user_id, key) DO NOTHING
				`, uid, def.key, def.title, def.body, def.tone)
			} else {
				_, err = s.pool.Exec(ctx, `
					DELETE FROM reminders
					WHERE user_id = $1 AND key = $2 AND dismissed_at IS NULL
				`, uid, def.key)
			}
			if err != nil {
				log.Printf("scheduler: sync reminder %s for user %d: %v", def.key, uid, err)
			}
		}
	}

	s.runScheduleReminders(ctx)
}

func (s *Scheduler) runScheduleReminders(ctx context.Context) {
	type schedRow struct {
		id        string
		homeID    string
		title     string
		itemName  *string
		nextDueAt time.Time
	}

	rows, err := s.pool.Query(ctx, `
		SELECT ms.id, ms.home_id, ms.title, i.name, ms.next_due_at
		FROM maintenance_schedules ms
		LEFT JOIN items i ON i.id = ms.item_id
	`)
	if err != nil {
		log.Printf("scheduler: list schedules: %v", err)
		return
	}
	var schedules []schedRow
	for rows.Next() {
		var sc schedRow
		if err := rows.Scan(&sc.id, &sc.homeID, &sc.title, &sc.itemName, &sc.nextDueAt); err != nil {
			log.Printf("scheduler: scan schedule: %v", err)
			rows.Close()
			return
		}
		schedules = append(schedules, sc)
	}
	rows.Close()

	memberRows, err := s.pool.Query(ctx, `SELECT home_id, user_id FROM home_members`)
	if err != nil {
		log.Printf("scheduler: list home members: %v", err)
		return
	}
	homeMembers := map[string][]int64{}
	for memberRows.Next() {
		var homeID string
		var userID int64
		if err := memberRows.Scan(&homeID, &userID); err != nil {
			log.Printf("scheduler: scan member: %v", err)
			memberRows.Close()
			return
		}
		homeMembers[homeID] = append(homeMembers[homeID], userID)
	}
	memberRows.Close()

	now := time.Now()
	warnWindow := now.AddDate(0, 0, 7)

	for _, sc := range schedules {
		key := "schedule_due_" + sc.id
		overdue := sc.nextDueAt.Before(now)
		dueSoon := !overdue && sc.nextDueAt.Before(warnWindow)
		shouldRemind := overdue || dueSoon

		var tone, title, body string
		if overdue {
			tone = "danger"
			title = sc.title + " is overdue"
			days := int(now.Sub(sc.nextDueAt).Hours() / 24)
			if sc.itemName != nil {
				body = fmt.Sprintf("%s — %d day(s) overdue", *sc.itemName, days)
			} else {
				body = fmt.Sprintf("%d day(s) overdue", days)
			}
		} else if dueSoon {
			tone = "warn"
			title = sc.title + " due soon"
			days := int(sc.nextDueAt.Sub(now).Hours() / 24)
			if sc.itemName != nil {
				body = fmt.Sprintf("%s — due in %d day(s)", *sc.itemName, days)
			} else {
				body = fmt.Sprintf("Due in %d day(s)", days)
			}
		}

		for _, uid := range homeMembers[sc.homeID] {
			var execErr error
			if shouldRemind {
				// Re-show the reminder if the tone escalates (warn → danger)
				_, execErr = s.pool.Exec(ctx, `
					INSERT INTO reminders (user_id, key, title, body, tone)
					VALUES ($1, $2, $3, $4, $5)
					ON CONFLICT (user_id, key) DO UPDATE
					SET title = EXCLUDED.title,
					    body = EXCLUDED.body,
					    tone = EXCLUDED.tone,
					    dismissed_at = CASE WHEN reminders.tone != EXCLUDED.tone THEN NULL ELSE reminders.dismissed_at END,
					    snoozed_until = CASE WHEN reminders.tone != EXCLUDED.tone THEN NULL ELSE reminders.snoozed_until END,
					    updated_at = NOW()
				`, uid, key, title, body, tone)
			} else {
				_, execErr = s.pool.Exec(ctx, `
					DELETE FROM reminders WHERE user_id = $1 AND key = $2
				`, uid, key)
			}
			if execErr != nil {
				log.Printf("scheduler: sync schedule reminder %s for user %d: %v", key, uid, execErr)
			}
		}
	}

	// Remove reminders for schedules that no longer exist
	if _, err := s.pool.Exec(ctx, `
		DELETE FROM reminders
		WHERE key LIKE 'schedule_due_%'
		  AND NOT EXISTS (
		      SELECT 1 FROM maintenance_schedules ms
		      WHERE 'schedule_due_' || ms.id::text = reminders.key
		  )
	`); err != nil {
		log.Printf("scheduler: cleanup orphan schedule reminders: %v", err)
	}
}
