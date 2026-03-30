package services

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/segmentio/kafka-go"
)

// KafkaProducer handles publishing messages to Kafka topics
type KafkaProducer struct {
	writer *kafka.Writer
	broker string
}

// NewKafkaProducer creates a new Kafka producer
func NewKafkaProducer(broker string) *KafkaProducer {
	return &KafkaProducer{
		broker: broker,
	}
}

// Publish publishes a message to the specified Kafka topic
func (p *KafkaProducer) Publish(ctx context.Context, topic string, message interface{}) error {
	// Create a new writer for each publish to support different topics
	writer := &kafka.Writer{
		Addr:         kafka.TCP(p.broker),
		Topic:        topic,
		Balancer:     &kafka.LeastBytes{},
		BatchTimeout: 10 * time.Millisecond,
		RequiredAcks: kafka.RequireOne,
	}
	defer writer.Close()

	// Marshal the message to JSON
	data, err := json.Marshal(message)
	if err != nil {
		return err
	}

	// Write the message
	err = writer.WriteMessages(ctx, kafka.Message{
		Value: data,
	})

	if err != nil {
		log.Printf("Failed to publish message to topic %s: %v", topic, err)
		return err
	}

	log.Printf("Published message to topic %s", topic)
	return nil
}

// Close closes the Kafka producer
func (p *KafkaProducer) Close() error {
	if p.writer != nil {
		return p.writer.Close()
	}
	return nil
}

// JobMessage represents a job message published to Kafka
type JobMessage struct {
	JobID     string                 `json:"job_id"`
	Name      string                 `json:"name"`
	JobType   string                 `json:"job_type"`
	Config    map[string]interface{} `json:"config,omitempty"`
	CreatedAt time.Time              `json:"created_at"`
}

// CancellationMessage represents a cancellation message published to Kafka
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
