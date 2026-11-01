package scheduler

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/robfig/cron/v3"
)

func newTestScheduler(fn func(context.Context) error) *Scheduler {
	return &Scheduler{
		c:     cron.New(),
		tasks: []*task{{name: "t", description: "d", interval: "Daily", spec: "@daily", fn: fn}},
	}
}

func waitIdle(t *testing.T, s *Scheduler) TaskStatus {
	t.Helper()
	deadline := time.Now().Add(2 * time.Second)
	for time.Now().Before(deadline) {
		if st := s.Tasks()[0]; !st.Running && st.LastRunAt != nil {
			return st
		}
		time.Sleep(5 * time.Millisecond)
	}
	t.Fatal("task did not finish")
	return TaskStatus{}
}

func TestRunNowRecordsSuccess(t *testing.T) {
	s := newTestScheduler(func(context.Context) error { return nil })
	if st := s.Tasks()[0]; st.LastRunAt != nil || st.LastStatus != "" {
		t.Fatalf("expected no run recorded yet, got %+v", st)
	}
	if err := s.RunNow("t"); err != nil {
		t.Fatal(err)
	}
	if st := waitIdle(t, s); st.LastStatus != "success" || st.LastError != "" {
		t.Fatalf("unexpected status: %+v", st)
	}
}

func TestRunNowRecordsErrorAndPanic(t *testing.T) {
	s := newTestScheduler(func(context.Context) error { return errors.New("boom") })
	_ = s.RunNow("t")
	if st := waitIdle(t, s); st.LastStatus != "error" || st.LastError != "boom" {
		t.Fatalf("unexpected status: %+v", st)
	}

	s = newTestScheduler(func(context.Context) error { panic("oops") })
	_ = s.RunNow("t")
	if st := waitIdle(t, s); st.LastStatus != "error" || st.LastError != "panic: oops" {
		t.Fatalf("unexpected status: %+v", st)
	}
}

func TestRunNowRejectsUnknownAndConcurrent(t *testing.T) {
	release := make(chan struct{})
	s := newTestScheduler(func(context.Context) error { <-release; return nil })

	if err := s.RunNow("missing"); !errors.Is(err, ErrUnknownTask) {
		t.Fatalf("expected ErrUnknownTask, got %v", err)
	}
	if err := s.RunNow("t"); err != nil {
		t.Fatal(err)
	}
	if err := s.RunNow("t"); !errors.Is(err, ErrAlreadyRunning) {
		t.Fatalf("expected ErrAlreadyRunning, got %v", err)
	}
	if !s.Tasks()[0].Running {
		t.Fatal("expected task to report running")
	}
	close(release)
	waitIdle(t, s)
}
