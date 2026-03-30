package main

import (
	"context"
	"encoding/json"
	"log"
	"math/rand"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/segmentio/kafka-go"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// JobMessage represents a job message from Kafka
type JobMessage struct {
	JobID        string                 `json:"job_id"`
	Name         string                 `json:"name"`
	JobType      string                 `json:"job_type"`
	Config       map[string]interface{} `json:"config,omitempty"`
	CreatedAt    time.Time              `json:"created_at"`
	ForceFailure bool                   `json:"force_failure,omitempty"`
}

// CancellationMessage represents a cancellation message from Kafka
type CancellationMessage struct {
	JobID       string    `json:"job_id"`
	CancelledAt time.Time `json:"cancelled_at"`
}

// DLQMessage represents a dead letter queue message
type DLQMessage struct {
	JobID        string    `json:"job_id"`
	FailedAt     time.Time `json:"failed_at"`
	ErrorMessage string    `json:"error_message"`
	RetryCount   int       `json:"retry_count"`
}

// Job statuses
const (
	StatusPending    = "pending"
	StatusProcessing = "processing"
	StatusCompleted  = "completed"
	StatusFailed     = "failed"
	StatusCancelling = "cancelling"
	StatusCancelled  = "cancelled"
)

func main() {
	// Get configuration from environment
	mongoURI := getEnv("MONGODB_URI", "mongodb://localhost:27017/jobprocessor")
	kafkaBrokers := getEnv("KAFKA_BROKERS", "localhost:9092")

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}
	defer client.Disconnect(context.Background())

	// Ping MongoDB
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("Failed to ping MongoDB: %v", err)
	}
	log.Println("Worker connected to MongoDB")

	collection := client.Database("jobprocessor").Collection("jobs")

	// Create context with cancellation
	ctx, cancel = context.WithCancel(context.Background())
	defer cancel()

	// Create wait group for consumers
	var wg sync.WaitGroup

	// Start jobs consumer
	wg.Add(1)
	go func() {
		defer wg.Done()
		consumeJobs(ctx, kafkaBrokers, collection)
	}()

	// Start cancellations consumer
	wg.Add(1)
	go func() {
		defer wg.Done()
		consumeCancellations(ctx, kafkaBrokers, collection)
	}()

	log.Println("Worker started, waiting for messages...")

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down worker...")
	cancel()
	wg.Wait()
	log.Println("Worker stopped")
}

func consumeJobs(ctx context.Context, brokers string, collection *mongo.Collection) {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:     []string{brokers},
		Topic:       "jobs",
		GroupID:     "job-worker",
		MinBytes:    10e3,
		MaxBytes:    10e6,
		StartOffset: kafka.FirstOffset,
	})
	defer reader.Close()

	for {
		select {
		case <-ctx.Done():
			return
		default:
			msg, err := reader.ReadMessage(ctx)
			if err != nil {
				if ctx.Err() != nil {
					return
				}
				log.Printf("Error reading message: %v", err)
				continue
			}

			var jobMsg JobMessage
			if err := json.Unmarshal(msg.Value, &jobMsg); err != nil {
				log.Printf("Error unmarshaling job message: %v", err)
				continue
			}

			log.Printf("Processing job: %s (%s)", jobMsg.JobID, jobMsg.Name)
			processJob(ctx, brokers, collection, jobMsg)
		}
	}
}

func publishToDLQ(ctx context.Context, brokers string, msg DLQMessage) error {
	w := &kafka.Writer{
		Addr:                   kafka.TCP(brokers),
		Topic:                  "jobs_dlq",
		Balancer:               &kafka.LeastBytes{},
		BatchTimeout:           10 * time.Millisecond,
		AllowAutoTopicCreation: true,
	}
	defer w.Close()

	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	return w.WriteMessages(ctx, kafka.Message{Value: data})
}

func processJob(ctx context.Context, brokers string, collection *mongo.Collection, jobMsg JobMessage) {
	objectID, err := primitive.ObjectIDFromHex(jobMsg.JobID)
	if err != nil {
		log.Printf("Invalid job ID: %s", jobMsg.JobID)
		return
	}

	// Update status to processing
	_, err = collection.UpdateOne(ctx, bson.M{"_id": objectID}, bson.M{
		"$set": bson.M{
			"status":     StatusProcessing,
			"updated_at": time.Now(),
		},
	})
	if err != nil {
		log.Printf("Failed to update job status to processing: %v", err)
		return
	}

	log.Printf("Job %s status updated to processing", jobMsg.JobID)

	// Simulate processing time (2-5 seconds)
	processingTime := time.Duration(2+rand.Intn(4)) * time.Second
	time.Sleep(processingTime)

	// Check if job was cancelled during processing
	var job bson.M
	err = collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&job)
	if err != nil {
		log.Printf("Failed to check job status: %v", err)
		return
	}

	if job["status"] == StatusCancelling || job["status"] == StatusCancelled {
		log.Printf("Job %s was cancelled, skipping completion", jobMsg.JobID)
		return
	}

	if jobMsg.ForceFailure {
		errMsg := "Job was forced to fail."
		_, err = collection.UpdateOne(ctx, bson.M{"_id": objectID}, bson.M{
			"$set": bson.M{
				"status":        StatusFailed,
				"error_message": errMsg,
				"updated_at":    time.Now(),
			},
		})
		if err != nil {
			log.Printf("Failed to update job status to failed: %v", err)
			return
		}

		// Fetch retry_count for DLQ message
		var failedJob bson.M
		if err := collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&failedJob); err == nil {
			retryCount, _ := failedJob["retry_count"].(int32)
			dlqMsg := DLQMessage{
				JobID:        jobMsg.JobID,
				FailedAt:     time.Now(),
				ErrorMessage: errMsg,
				RetryCount:   int(retryCount),
			}
			if err := publishToDLQ(ctx, brokers, dlqMsg); err != nil {
				log.Printf("Warning: failed to publish to DLQ: %v", err)
			} else {
				log.Printf("Job %s published to DLQ", jobMsg.JobID)
			}
		}

		log.Printf("Job %s forced to fail", jobMsg.JobID)
		return
	}

	// Update status to completed
	_, err = collection.UpdateOne(ctx, bson.M{"_id": objectID}, bson.M{
		"$set": bson.M{
			"status":     StatusCompleted,
			"updated_at": time.Now(),
		},
	})
	if err != nil {
		log.Printf("Failed to update job status to completed: %v", err)
		return
	}

	log.Printf("Job %s completed successfully", jobMsg.JobID)
}

func consumeCancellations(ctx context.Context, brokers string, collection *mongo.Collection) {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:     []string{brokers},
		Topic:       "job_cancellations",
		GroupID:     "job-worker-cancellations",
		MinBytes:    10e3,
		MaxBytes:    10e6,
		StartOffset: kafka.LastOffset,
	})
	defer reader.Close()

	for {
		select {
		case <-ctx.Done():
			return
		default:
			msg, err := reader.ReadMessage(ctx)
			if err != nil {
				if ctx.Err() != nil {
					return
				}
				log.Printf("Error reading cancellation message: %v", err)
				continue
			}

			var cancelMsg CancellationMessage
			if err := json.Unmarshal(msg.Value, &cancelMsg); err != nil {
				log.Printf("Error unmarshaling cancellation message: %v", err)
				continue
			}

			log.Printf("Processing cancellation for job: %s", cancelMsg.JobID)
			processCancellation(ctx, collection, cancelMsg)
		}
	}
}

func processCancellation(ctx context.Context, collection *mongo.Collection, cancelMsg CancellationMessage) {
	objectID, err := primitive.ObjectIDFromHex(cancelMsg.JobID)
	if err != nil {
		log.Printf("Invalid job ID for cancellation: %s", cancelMsg.JobID)
		return
	}

	// Update status to cancelled
	result, err := collection.UpdateOne(ctx,
		bson.M{
			"_id":    objectID,
			"status": bson.M{"$in": []string{StatusPending, StatusProcessing, StatusCancelling}},
		},
		bson.M{
			"$set": bson.M{
				"status":     StatusCancelled,
				"updated_at": time.Now(),
			},
		},
	)
	if err != nil {
		log.Printf("Failed to cancel job: %v", err)
		return
	}

	if result.ModifiedCount > 0 {
		log.Printf("Job %s cancelled successfully", cancelMsg.JobID)
	} else {
		log.Printf("Job %s could not be cancelled (may have already completed)", cancelMsg.JobID)
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
