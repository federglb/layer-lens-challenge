package repositories

import (
	"context"
	"time"

	"github.com/fullstack-assessment/backend/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// JobsRepository interface defines the methods for job data access
type JobsRepository interface {
	Create(ctx context.Context, job *models.Job) error
	GetByID(ctx context.Context, id string) (*models.Job, error)
	List(ctx context.Context, page, limit int) ([]models.Job, int64, error)
	UpdateStatus(ctx context.Context, id string, status models.JobStatus) error
	UpdateStatusWithRetry(ctx context.Context, id string, status models.JobStatus, retryCount int) error
	Update(ctx context.Context, job *models.Job) error
}

type jobsRepository struct {
	collection *mongo.Collection
}

// NewJobsRepository creates a new jobs repository
func NewJobsRepository(db *mongo.Database) JobsRepository {
	return &jobsRepository{
		collection: db.Collection("jobs"),
	}
}

// Create creates a new job in the database
func (r *jobsRepository) Create(ctx context.Context, job *models.Job) error {
	job.ID = primitive.NewObjectID()
	job.CreatedAt = time.Now()
	job.UpdatedAt = time.Now()

	_, err := r.collection.InsertOne(ctx, job)
	return err
}

// GetByID retrieves a job by its ID
func (r *jobsRepository) GetByID(ctx context.Context, id string) (*models.Job, error) {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return nil, err
	}

	var job models.Job
	err = r.collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&job)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, err
	}

	return &job, nil
}

// List retrieves a paginated list of jobs
func (r *jobsRepository) List(ctx context.Context, page, limit int) ([]models.Job, int64, error) {
	skip := (page - 1) * limit

	// Get total count
	total, err := r.collection.CountDocuments(ctx, bson.M{})
	if err != nil {
		return nil, 0, err
	}

	// Get jobs with pagination, sorted by created_at descending
	opts := options.Find().
		SetSkip(int64(skip)).
		SetLimit(int64(limit)).
		SetSort(bson.D{{Key: "created_at", Value: -1}})

	cursor, err := r.collection.Find(ctx, bson.M{}, opts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var jobs []models.Job
	if err := cursor.All(ctx, &jobs); err != nil {
		return nil, 0, err
	}

	return jobs, total, nil
}

// UpdateStatus updates the status of a job
func (r *jobsRepository) UpdateStatus(ctx context.Context, id string, status models.JobStatus) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	update := bson.M{
		"$set": bson.M{
			"status":     status,
			"updated_at": time.Now(),
		},
	}

	_, err = r.collection.UpdateOne(ctx, bson.M{"_id": objectID}, update)
	return err
}

// UpdateStatusWithRetry updates the status and retry count of a job
func (r *jobsRepository) UpdateStatusWithRetry(ctx context.Context, id string, status models.JobStatus, retryCount int) error {
	objectID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		return err
	}

	update := bson.M{
		"$set": bson.M{
			"status":      status,
			"retry_count": retryCount,
			"updated_at":  time.Now(),
		},
	}

	_, err = r.collection.UpdateOne(ctx, bson.M{"_id": objectID}, update)
	return err
}

// Update updates a job in the database
func (r *jobsRepository) Update(ctx context.Context, job *models.Job) error {
	job.UpdatedAt = time.Now()

	_, err := r.collection.ReplaceOne(ctx, bson.M{"_id": job.ID}, job)
	return err
}
