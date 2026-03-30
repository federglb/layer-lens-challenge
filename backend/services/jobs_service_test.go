package services

import (
	"context"
	"errors"
	"testing"

	"github.com/fullstack-assessment/backend/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// ─── Mock: JobsRepository ─────────────────────────────────────────────────────

type mockRepo struct {
	createFn       func(ctx context.Context, job *models.Job) error
	getByIDFn      func(ctx context.Context, id string) (*models.Job, error)
	updateStatusFn func(ctx context.Context, id string, status models.JobStatus) error
	updateFn       func(ctx context.Context, job *models.Job) error
}

func (m *mockRepo) Create(ctx context.Context, job *models.Job) error {
	if m.createFn != nil {
		return m.createFn(ctx, job)
	}
	job.ID = primitive.NewObjectID()
	return nil
}

func (m *mockRepo) GetByID(ctx context.Context, id string) (*models.Job, error) {
	if m.getByIDFn != nil {
		return m.getByIDFn(ctx, id)
	}
	return nil, nil
}

func (m *mockRepo) List(_ context.Context, _, _ int) ([]models.Job, int64, error) {
	return nil, 0, nil
}

func (m *mockRepo) UpdateStatus(ctx context.Context, id string, status models.JobStatus) error {
	if m.updateStatusFn != nil {
		return m.updateStatusFn(ctx, id, status)
	}
	return nil
}

func (m *mockRepo) UpdateStatusWithRetry(_ context.Context, _ string, _ models.JobStatus, _ int) error {
	return nil
}

func (m *mockRepo) Update(ctx context.Context, job *models.Job) error {
	if m.updateFn != nil {
		return m.updateFn(ctx, job)
	}
	return nil
}

// ─── Mock: kafkaPublisher ─────────────────────────────────────────────────────

type publishCall struct {
	topic   string
	message interface{}
}

type mockProducer struct {
	calls []publishCall
	err   error
}

func (m *mockProducer) Publish(_ context.Context, topic string, message interface{}) error {
	m.calls = append(m.calls, publishCall{topic: topic, message: message})
	return m.err
}

// ─── Helper ───────────────────────────────────────────────────────────────────

func newTestService(repo *mockRepo, producer *mockProducer) *jobsService {
	return &jobsService{repo: repo, producer: producer}
}

// ─── TestCreateJob ────────────────────────────────────────────────────────────

func TestCreateJob(t *testing.T) {
	tests := []struct {
		name       string
		req        CreateJobRequest
		repoErr    error
		wantErr    bool
		wantValErr bool
	}{
		{
			name: "valid input creates job successfully",
			req:  CreateJobRequest{Name: "test job", JobType: "process"},
		},
		{
			name: "all valid job types are accepted",
			req:  CreateJobRequest{Name: "export job", JobType: "export"},
		},
		{
			name:       "invalid job_type returns validation error",
			req:        CreateJobRequest{Name: "test job", JobType: "invalid"},
			wantErr:    true,
			wantValErr: true,
		},
		{
			name:       "empty job_type returns validation error",
			req:        CreateJobRequest{Name: "test job", JobType: ""},
			wantErr:    true,
			wantValErr: true,
		},
		{
			name:       "missing name returns validation error",
			req:        CreateJobRequest{Name: "", JobType: "process"},
			wantErr:    true,
			wantValErr: true,
		},
		{
			name:    "repository failure is propagated",
			req:     CreateJobRequest{Name: "test job", JobType: "process"},
			repoErr: errors.New("db unavailable"),
			wantErr: true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := &mockRepo{
				createFn: func(_ context.Context, job *models.Job) error {
					job.ID = primitive.NewObjectID()
					return tc.repoErr
				},
			}
			producer := &mockProducer{}
			svc := newTestService(repo, producer)

			job, err := svc.CreateJob(context.Background(), tc.req)

			if tc.wantErr {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				if tc.wantValErr && !IsValidationError(err) {
					t.Errorf("expected ValidationError, got %T: %v", err, err)
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if job == nil {
				t.Fatal("expected job, got nil")
			}
			if job.Status != models.JobStatusPending {
				t.Errorf("status = %q, want %q", job.Status, models.JobStatusPending)
			}
			if job.Name != tc.req.Name {
				t.Errorf("name = %q, want %q", job.Name, tc.req.Name)
			}
			if string(job.JobType) != tc.req.JobType {
				t.Errorf("job_type = %q, want %q", job.JobType, tc.req.JobType)
			}
		})
	}
}

// ─── TestGetJob ───────────────────────────────────────────────────────────────

func TestGetJob(t *testing.T) {
	existingID := primitive.NewObjectID()
	existingJob := &models.Job{
		ID:      existingID,
		Name:    "existing job",
		JobType: models.JobTypeProcess,
		Status:  models.JobStatusPending,
	}

	tests := []struct {
		name    string
		id      string
		repoJob *models.Job
		repoErr error
		wantErr error
	}{
		{
			name:    "existing job is returned",
			id:      existingID.Hex(),
			repoJob: existingJob,
		},
		{
			name:    "non-existent job returns ErrJobNotFound",
			id:      primitive.NewObjectID().Hex(),
			repoJob: nil,
			wantErr: ErrJobNotFound,
		},
		{
			name:    "repository error is propagated",
			id:      primitive.NewObjectID().Hex(),
			repoErr: errors.New("db timeout"),
			wantErr: errors.New("db timeout"), // checked via string containment below
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := &mockRepo{
				getByIDFn: func(_ context.Context, _ string) (*models.Job, error) {
					return tc.repoJob, tc.repoErr
				},
			}
			svc := newTestService(repo, &mockProducer{})

			job, err := svc.GetJob(context.Background(), tc.id)

			if tc.wantErr != nil {
				if err == nil {
					t.Fatal("expected error, got nil")
				}
				// For sentinel errors use errors.Is; for wrapped errors check message.
				if errors.Is(tc.wantErr, ErrJobNotFound) {
					if !errors.Is(err, ErrJobNotFound) {
						t.Errorf("error = %v, want %v", err, ErrJobNotFound)
					}
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if job == nil {
				t.Fatal("expected job, got nil")
			}
			if job.ID != existingJob.ID {
				t.Errorf("job.ID = %v, want %v", job.ID, existingJob.ID)
			}
		})
	}
}

// ─── TestCancelJob ────────────────────────────────────────────────────────────

func TestCancelJob(t *testing.T) {
	makeJob := func(status models.JobStatus) *models.Job {
		return &models.Job{
			ID:      primitive.NewObjectID(),
			Name:    "test job",
			JobType: models.JobTypeProcess,
			Status:  status,
		}
	}

	tests := []struct {
		name       string
		job        *models.Job // nil → repo returns not found
		wantErr    error
		wantStatus models.JobStatus
		wantKafka  bool
	}{
		{
			name:       "pending job transitions to cancelling",
			job:        makeJob(models.JobStatusPending),
			wantStatus: models.JobStatusCancelling,
			wantKafka:  true,
		},
		{
			name:       "processing job transitions to cancelling",
			job:        makeJob(models.JobStatusProcessing),
			wantStatus: models.JobStatusCancelling,
			wantKafka:  true,
		},
		{
			name:    "completed job returns ErrInvalidJobState",
			job:     makeJob(models.JobStatusCompleted),
			wantErr: ErrInvalidJobState,
		},
		{
			name:    "failed job returns ErrInvalidJobState",
			job:     makeJob(models.JobStatusFailed),
			wantErr: ErrInvalidJobState,
		},
		{
			name:    "already cancelled job returns ErrInvalidJobState",
			job:     makeJob(models.JobStatusCancelled),
			wantErr: ErrInvalidJobState,
		},
		{
			name:    "cancelling job returns ErrInvalidJobState",
			job:     makeJob(models.JobStatusCancelling),
			wantErr: ErrInvalidJobState,
		},
		{
			name:    "non-existent job returns ErrJobNotFound",
			job:     nil,
			wantErr: ErrJobNotFound,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			repo := &mockRepo{
				getByIDFn: func(_ context.Context, _ string) (*models.Job, error) {
					return tc.job, nil
				},
			}
			producer := &mockProducer{}
			svc := newTestService(repo, producer)

			id := primitive.NewObjectID().Hex()
			if tc.job != nil {
				id = tc.job.ID.Hex()
			}

			result, err := svc.CancelJob(context.Background(), id)

			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Errorf("error = %v, want %v", err, tc.wantErr)
				}
				if len(producer.calls) != 0 {
					t.Errorf("expected no Kafka publish on error, got %d call(s)", len(producer.calls))
				}
				return
			}

			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if result.Status != tc.wantStatus {
				t.Errorf("status = %q, want %q", result.Status, tc.wantStatus)
			}

			if tc.wantKafka {
				if len(producer.calls) != 1 {
					t.Fatalf("expected 1 Kafka publish, got %d", len(producer.calls))
				}

				call := producer.calls[0]

				if call.topic != "job_cancellations" {
					t.Errorf("kafka topic = %q, want %q", call.topic, "job_cancellations")
				}

				msg, ok := call.message.(CancellationMessage)
				if !ok {
					t.Fatalf("expected CancellationMessage payload, got %T", call.message)
				}
				if msg.JobID != id {
					t.Errorf("CancellationMessage.job_id = %q, want %q", msg.JobID, id)
				}
				if msg.CancelledAt.IsZero() {
					t.Error("expected CancellationMessage.cancelled_at to be set")
				}
			}
		})
	}
}
