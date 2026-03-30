package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// JobType represents the type of job
type JobType string

const (
	JobTypeProcess JobType = "process"
	JobTypeAnalyze JobType = "analyze"
	JobTypeExport  JobType = "export"
)

// JobStatus represents the current status of a job
type JobStatus string

const (
	JobStatusPending    JobStatus = "pending"
	JobStatusProcessing JobStatus = "processing"
	JobStatusCompleted  JobStatus = "completed"
	JobStatusFailed     JobStatus = "failed"
	JobStatusCancelling JobStatus = "cancelling"
	JobStatusCancelled  JobStatus = "cancelled"
)

// Job represents a processing job
type Job struct {
	ID           primitive.ObjectID     `bson:"_id,omitempty" json:"id"`
	Name         string                 `bson:"name" json:"name"`
	JobType      JobType                `bson:"job_type" json:"jobType"`
	Status       JobStatus              `bson:"status" json:"status"`
	Config       map[string]interface{} `bson:"config,omitempty" json:"config,omitempty"`
	ErrorMessage string                 `bson:"error_message,omitempty" json:"errorMessage,omitempty"`
	RetryCount   int                    `bson:"retry_count" json:"retryCount"`
	CreatedAt    time.Time              `bson:"created_at" json:"createdAt"`
	UpdatedAt    time.Time              `bson:"updated_at" json:"updatedAt"`
}

// ValidJobTypes returns the list of valid job types
func ValidJobTypes() []JobType {
	return []JobType{JobTypeProcess, JobTypeAnalyze, JobTypeExport}
}

// IsValidJobType checks if a job type is valid
func IsValidJobType(jobType string) bool {
	for _, valid := range ValidJobTypes() {
		if string(valid) == jobType {
			return true
		}
	}
	return false
}

// IsTerminalStatus checks if a job status is terminal (cannot be changed)
func (s JobStatus) IsTerminal() bool {
	return s == JobStatusCompleted || s == JobStatusFailed || s == JobStatusCancelled
}

// CanBeCancelled checks if a job can be cancelled
func (j *Job) CanBeCancelled() bool {
	return j.Status == JobStatusPending || j.Status == JobStatusProcessing
}

// CanBeRetried checks if a job can be retried
func (j *Job) CanBeRetried() bool {
	return j.Status == JobStatusFailed && j.RetryCount < 3
}
