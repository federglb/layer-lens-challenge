package services

import (
	"context"
	"errors"
	"fmt"

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
	Name    string                 `json:"name"`
	JobType string                 `json:"job_type"`
	Config  map[string]interface{} `json:"config,omitempty"`
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

type jobsService struct {
	repo     repositories.JobsRepository
	producer *KafkaProducer
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
		Name:       req.Name,
		JobType:    models.JobType(req.JobType),
		Status:     models.JobStatusPending,
		Config:     req.Config,
		RetryCount: 0,
	}

	if err := s.repo.Create(ctx, job); err != nil {
		return nil, fmt.Errorf("failed to create job: %w", err)
	}

	// Publish to Kafka
	message := JobMessage{
		JobID:     job.ID.Hex(),
		Name:      job.Name,
		JobType:   string(job.JobType),
		Config:    job.Config,
		CreatedAt: job.CreatedAt,
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
// NOTE: This is a skeleton - candidate should implement this
func (s *jobsService) CancelJob(ctx context.Context, id string) (*models.Job, error) {
	// TODO: Candidate implements this
	// 1. Get the job by ID
	// 2. Check if job exists
	// 3. Check if job can be cancelled (pending or processing status)
	// 4. Update job status to "cancelling"
	// 5. Publish cancellation message to Kafka topic "job_cancellations"
	// 6. Return the updated job

	return nil, errors.New("not implemented")
}

// RetryJob retries a failed job
// NOTE: This is a skeleton - candidate should implement this
func (s *jobsService) RetryJob(ctx context.Context, id string) (*models.Job, error) {
	// TODO: Candidate implements this
	// 1. Get the job by ID
	// 2. Check if job exists
	// 3. Check if job can be retried (failed status, retry_count < 3)
	// 4. Increment retry_count
	// 5. Update job status to "pending"
	// 6. Re-publish job to Kafka topic "jobs"
	// 7. Return the updated job

	return nil, errors.New("not implemented")
}

// IsValidationError checks if an error is a validation error
func IsValidationError(err error) bool {
	var validationErr *ValidationError
	return errors.As(err, &validationErr)
}
