// Package scheduler runs periodic jobs that generate user reminders.
package scheduler

import (
	"context"
	"errors"
	"fmt"
	"log"
	"sync"
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

// ErrUnknownTask is returned by RunNow for a task name that isn't registered.
var ErrUnknownTask = errors.New("unknown scheduled task")

// ErrAlreadyRunning is returned by RunNow when the task is already executing.
var ErrAlreadyRunning = errors.New("task is already running")

const taskTimeout = 10 * time.Minute

type task struct {
	name        string
	description string
	interval    string // human-readable cadence
	spec        string // cron spec
	fn          func(ctx context.Context) error
	entryID     cron.EntryID

	mu        sync.Mutex
	running   bool
	ran       bool
	lastStart time.Time
	lastTook  time.Duration
	lastErr   error
}

// begin marks the task running; it reports false if it already was.
func (t *task) begin() bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	if t.running {
		return false
	}
	t.running = true
	return true
}

func (t *task) end(start time.Time, took time.Duration, err error) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.running = false
	t.ran = true
	t.lastStart = start
	t.lastTook = took
	t.lastErr = err
}

// TaskStatus is a point-in-time view of a scheduled task.
type TaskStatus struct {
	Name           string
	Description    string
	Interval       string
	Schedule       string
	Running        bool
	LastRunAt      *time.Time
	LastDurationMs *int64
	LastStatus     string // "", "success" or "error"
	LastError      string
	NextRunAt      *time.Time
}

// Scheduler runs reminder-generation jobs on a cron schedule.
type Scheduler struct {
	pool  *pgxpool.Pool
	c     *cron.Cron
	tasks []*task
}

// New creates a Scheduler backed by the given connection pool.
func New(pool *pgxpool.Pool) *Scheduler {
	s := &Scheduler{pool: pool, c: cron.New()}
	s.tasks = []*task{
		{
			name:        "system-reminders",
			description: "Creates onboarding and housekeeping reminders (add items, add photos, insure high-value items) and clears them once resolved.",
			interval:    "Daily at midnight",
			spec:        "@daily",
			fn:          s.runSystemReminders,
		},
		{
			name:        "maintenance-reminders",
			description: "Creates due-soon (7 days) and overdue reminders for maintenance schedules.",
			interval:    "Daily at midnight",
			spec:        "@daily",
			fn:          s.runScheduleReminders,
		},
		{
			name:        "warranty-reminders",
			description: "Creates expiring-soon (30 days) and expired reminders for item warranties.",
			interval:    "Daily at midnight",
			spec:        "@daily",
			fn:          s.runWarrantyReminders,
		},
	}
	return s
}

// Start registers every task on its schedule, then runs each once immediately.
func (s *Scheduler) Start() {
	for _, t := range s.tasks {
		t := t
		id, err := s.c.AddFunc(t.spec, func() { s.execute(t) })
		if err != nil {
			log.Printf("scheduler: register %s: %v", t.name, err)
			continue
		}
		t.entryID = id
	}
	s.c.Start()
	go func() {
		for _, t := range s.tasks {
			s.execute(t)
		}
	}()
}

// Stop halts the cron scheduler.
func (s *Scheduler) Stop() {
	s.c.Stop()
}

// Tasks returns the current status of every registered task.
func (s *Scheduler) Tasks() []TaskStatus {
	out := make([]TaskStatus, 0, len(s.tasks))
	for _, t := range s.tasks {
		st := TaskStatus{
			Name: t.name, Description: t.description, Interval: t.interval, Schedule: t.spec,
		}
		if t.entryID != 0 {
			if next := s.c.Entry(t.entryID).Next; !next.IsZero() {
				st.NextRunAt = &next
			}
		}
		t.mu.Lock()
		st.Running = t.running
		if t.ran {
			started := t.lastStart
			ms := t.lastTook.Milliseconds()
			st.LastRunAt = &started
			st.LastDurationMs = &ms
			if t.lastErr != nil {
				st.LastStatus = "error"
				st.LastError = t.lastErr.Error()
			} else {
				st.LastStatus = "success"
			}
		}
		t.mu.Unlock()
		out = append(out, st)
	}
	return out
}

// RunNow starts the named task in the background. It returns ErrUnknownTask or
// ErrAlreadyRunning without starting anything.
func (s *Scheduler) RunNow(name string) error {
	for _, t := range s.tasks {
		if t.name != name {
			continue
		}
		if !t.begin() {
			return ErrAlreadyRunning
		}
		go s.runBegun(t)
		return nil
	}
	return ErrUnknownTask
}

// execute runs a task unless it is already running (e.g. a manual run overlaps the cron tick).
func (s *Scheduler) execute(t *task) {
	if !t.begin() {
		log.Printf("scheduler: %s already running, skipping", t.name)
		return
	}
	s.runBegun(t)
}

func (s *Scheduler) runBegun(t *task) {
	start := time.Now()
	ctx, cancel := context.WithTimeout(context.Background(), taskTimeout)
	defer cancel()
	err := safeRun(ctx, t.fn)
	t.end(start, time.Since(start), err)
	if err != nil {
		log.Printf("scheduler: %s finished with errors: %v", t.name, err)
	}
}

func safeRun(ctx context.Context, fn func(context.Context) error) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("panic: %v", r)
		}
	}()
	return fn(ctx)
}

// syncErrors gathers per-row failures so a run can report them without aborting.
type syncErrors struct {
	n     int
	first error
}

func (e *syncErrors) add(err error) {
	if err == nil {
		return
	}
	e.n++
	if e.first == nil {
		e.first = err
	}
}

func (e *syncErrors) err() error {
	if e.n == 0 {
		return nil
	}
	return fmt.Errorf("%d sync error(s), first: %w", e.n, e.first)
}

func (s *Scheduler) runSystemReminders(ctx context.Context) error {
	rows, err := s.pool.Query(ctx, `SELECT id FROM users`)
	if err != nil {
		return fmt.Errorf("list users: %w", err)
	}
	var userIDs []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return fmt.Errorf("scan user: %w", err)
		}
		userIDs = append(userIDs, id)
	}
	rows.Close()

	var errs syncErrors
	for _, def := range definitions {
		active, err := def.check(ctx, s.pool)
		if err != nil {
			errs.add(fmt.Errorf("check %s: %w", def.key, err))
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
				errs.add(err)
			}
		}
	}
	return errs.err()
}

func (s *Scheduler) runScheduleReminders(ctx context.Context) error {
	var errs syncErrors

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
		return fmt.Errorf("list schedules: %w", err)
	}
	var schedules []schedRow
	for rows.Next() {
		var sc schedRow
		if err := rows.Scan(&sc.id, &sc.homeID, &sc.title, &sc.itemName, &sc.nextDueAt); err != nil {
			rows.Close()
			return fmt.Errorf("scan schedule: %w", err)
		}
		schedules = append(schedules, sc)
	}
	rows.Close()

	memberRows, err := s.pool.Query(ctx, `SELECT home_id, user_id FROM home_members`)
	if err != nil {
		return fmt.Errorf("list home members: %w", err)
	}
	homeMembers := map[string][]int64{}
	for memberRows.Next() {
		var homeID string
		var userID int64
		if err := memberRows.Scan(&homeID, &userID); err != nil {
			memberRows.Close()
			return fmt.Errorf("scan member: %w", err)
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
				errs.add(execErr)
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
		errs.add(err)
	}
	return errs.err()
}

func (s *Scheduler) runWarrantyReminders(ctx context.Context) error {
	var errs syncErrors

	type itemRow struct {
		id                string
		homeID            string
		name              string
		warrantyExpiresAt time.Time
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, home_id, name, warranty_expires_at
		FROM items
		WHERE warranty_expires_at IS NOT NULL
	`)
	if err != nil {
		return fmt.Errorf("list items with warranty expiration: %w", err)
	}
	var items []itemRow
	for rows.Next() {
		var it itemRow
		if err := rows.Scan(&it.id, &it.homeID, &it.name, &it.warrantyExpiresAt); err != nil {
			rows.Close()
			return fmt.Errorf("scan item: %w", err)
		}
		items = append(items, it)
	}
	rows.Close()

	memberRows, err := s.pool.Query(ctx, `SELECT home_id, user_id FROM home_members`)
	if err != nil {
		return fmt.Errorf("list home members: %w", err)
	}
	homeMembers := map[string][]int64{}
	for memberRows.Next() {
		var homeID string
		var userID int64
		if err := memberRows.Scan(&homeID, &userID); err != nil {
			memberRows.Close()
			return fmt.Errorf("scan member: %w", err)
		}
		homeMembers[homeID] = append(homeMembers[homeID], userID)
	}
	memberRows.Close()

	now := time.Now()
	warnWindow := now.AddDate(0, 0, 30)

	for _, it := range items {
		key := "warranty_expiring_" + it.id
		expired := it.warrantyExpiresAt.Before(now)
		expiringSoon := !expired && it.warrantyExpiresAt.Before(warnWindow)
		shouldRemind := expired || expiringSoon

		var tone, title, body string
		if expired {
			tone = "danger"
			title = it.name + " warranty expired"
			days := int(now.Sub(it.warrantyExpiresAt).Hours() / 24)
			body = fmt.Sprintf("Warranty expired %d day(s) ago", days)
		} else if expiringSoon {
			tone = "warn"
			title = it.name + " warranty expiring soon"
			days := int(it.warrantyExpiresAt.Sub(now).Hours() / 24)
			body = fmt.Sprintf("Warranty expires in %d day(s)", days)
		}

		for _, uid := range homeMembers[it.homeID] {
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
				log.Printf("scheduler: sync warranty reminder %s for user %d: %v", key, uid, execErr)
				errs.add(execErr)
			}
		}
	}

	// Remove reminders for items that no longer exist or no longer have a warranty expiration date
	if _, err := s.pool.Exec(ctx, `
		DELETE FROM reminders
		WHERE key LIKE 'warranty_expiring_%'
		  AND NOT EXISTS (
		      SELECT 1 FROM items i
		      WHERE 'warranty_expiring_' || i.id::text = reminders.key AND i.warranty_expires_at IS NOT NULL
		  )
	`); err != nil {
		log.Printf("scheduler: cleanup orphan warranty reminders: %v", err)
		errs.add(err)
	}
	return errs.err()
}
