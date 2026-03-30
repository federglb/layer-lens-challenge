package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/fullstack-assessment/backend/models"
	"github.com/fullstack-assessment/backend/repositories"
)

// Custom error types for the jobs service
var (
	ErrJobNotFound       = errors.New("job not found")
	ErrInvalidJobType    = errors.New("invalid job type")
	ErrMissingJobName    = errors.New("job name is required")
	ErrInvalidJobState   = errors.New("job cannot be modified in its current state")
	ErrMaxRetriesReached = errors.New("maximum retry attempts reached")
)

// ValidationError represents a validation error with additional context
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return fmt.Sprintf("%s: %s", e.Field, e.Message)
}

// CreateJobRequest represents the request to create a new job
type CreateJobRequest struct {
	Name         string                 `json:"name"`
	JobType      string                 `json:"job_type"`
	Config       map[string]interface{} `json:"config,omitempty"`
	ForceFailure bool                   `json:"force_failure,omitempty"`
}

// JobFilter represents filters for listing jobs
type JobFilter struct {
	Page  int
	Limit int
}

// JobsService interface defines the methods for job business logic
type JobsService interface {
	CreateJob(ctx context.Context, req CreateJobRequest) (*models.Job, error)
	GetJob(ctx context.Context, id string) (*models.Job, error)
	ListJobs(ctx context.Context, filter JobFilter) ([]models.Job, int64, error)
	CancelJob(ctx context.Context, id string) (*models.Job, error)
	RetryJob(ctx context.Context, id string) (*models.Job, error)
}

// kafkaPublisher is the narrow interface jobsService uses to publish messages.
// In production this is satisfied by *KafkaProducer; in tests by a mock.
type kafkaPublisher interface {
	Publish(ctx context.Context, topic string, message interface{}) error
}

type jobsService struct {
	repo     repositories.JobsRepository
	producer kafkaPublisher
}

// NewJobsService creates a new jobs service
func NewJobsService(repo repositories.JobsRepository, producer *KafkaProducer) JobsService {
	return &jobsService{
		repo:     repo,
		producer: producer,
	}
}

// CreateJob creates a new job and publishes it to Kafka
func (s *jobsService) CreateJob(ctx context.Context, req CreateJobRequest) (*models.Job, error) {
	// Validate request
	if req.Name == "" {
		return nil, &ValidationError{Field: "name", Message: "job name is required"}
	}

	if !models.IsValidJobType(req.JobType) {
		return nil, &ValidationError{
			Field:   "job_type",
			Message: fmt.Sprintf("invalid job type '%s', must be one of: process, analyze, export", req.JobType),
		}
	}

	// Create the job
	job := &models.Job{
		Name:         req.Name,
		JobType:      models.JobType(req.JobType),
		Status:       models.JobStatusPending,
		Config:       req.Config,
		RetryCount:   0,
		ForceFailure: req.ForceFailure,
	}

	if err := s.repo.Create(ctx, job); err != nil {
		return nil, fmt.Errorf("failed to create job: %w", err)
	}

	// Publish to Kafka
	message := JobMessage{
		JobID:        job.ID.Hex(),
		Name:         job.Name,
		JobType:      string(job.JobType),
		Config:       job.Config,
		CreatedAt:    job.CreatedAt,
		ForceFailure: req.ForceFailure,
	}

	if err := s.producer.Publish(ctx, "jobs", message); err != nil {
		// Log but don't fail - the job is created, worker can pick it up later
		fmt.Printf("Warning: failed to publish job to Kafka: %v\n", err)
	}

	return job, nil
}

// GetJob retrieves a job by ID
func (s *jobsService) GetJob(ctx context.Context, id string) (*models.Job, error) {
	job, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get job: %w", err)
	}

	if job == nil {
		return nil, ErrJobNotFound
	}

	return job, nil
}

// ListJobs retrieves a paginated list of jobs
func (s *jobsService) ListJobs(ctx context.Context, filter JobFilter) ([]models.Job, int64, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit < 1 || filter.Limit > 100 {
		filter.Limit = 10
	}

	jobs, total, err := s.repo.List(ctx, filter.Page, filter.Limit)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list jobs: %w", err)
	}

	return jobs, total, nil
}

// CancelJob cancels a job and publishes a cancellation message to Kafka
func (s *jobsService) CancelJob(ctx context.Context, id string) (*models.Job, error) {
	job, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get job: %w", err)
	}
	if job == nil {
		return nil, ErrJobNotFound
	}
	if !job.CanBeCancelled() {
		return nil, ErrInvalidJobState
	}

	if err := s.repo.UpdateStatus(ctx, id, models.JobStatusCancelling); err != nil {
		return nil, fmt.Errorf("failed to update job status: %w", err)
	}

	msg := CancellationMessage{
		JobID:       id,
		CancelledAt: time.Now(),
	}
	if err := s.producer.Publish(ctx, "job_cancellations", msg); err != nil {
		fmt.Printf("Warning: failed to publish cancellation to Kafka: %v\n", err)
	}

	job.Status = models.JobStatusCancelling
	return job, nil
}

// RetryJob retries a failed job
func (s *jobsService) RetryJob(ctx context.Context, id string) (*models.Job, error) {
	job, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get job: %w", err)
	}
	if job == nil {
		return nil, ErrJobNotFound
	}
	if job.Status != models.JobStatusFailed {
		return nil, ErrInvalidJobState
	}
	if job.RetryCount >= 3 {
		return nil, ErrMaxRetriesReached
	}

	job.RetryCount++
	job.Status = models.JobStatusPending
	job.ErrorMessage = ""

	if err := s.repo.Update(ctx, job); err != nil {
		return nil, fmt.Errorf("failed to update job: %w", err)
	}

	message := JobMessage{
		JobID:        job.ID.Hex(),
		Name:         job.Name,
		JobType:      string(job.JobType),
		Config:       job.Config,
		CreatedAt:    job.CreatedAt,
		ForceFailure: job.ForceFailure,
	}

	if err := s.producer.Publish(ctx, "jobs", message); err != nil {
		fmt.Printf("Warning: failed to re-publish job to Kafka: %v\n", err)
	}

	return job, nil
}

// IsValidationError checks if an error is a validation error
func IsValidationError(err error) bool {
	var validationErr *ValidationError
	return errors.As(err, &validationErr)
}
