package services

// TODO: Candidate writes tests here
//
// Test the following scenarios:
//
// CreateJob:
// - Valid input creates a job successfully
// - Invalid job_type returns an error
// - Missing required field "name" returns an error
//
// GetJob:
// - Existing job is returned
// - Non-existent job returns a not-found error
//
// CancelJob: (after completing Task 2)
// - Valid cancellation works
// - Cancelling a "completed" job returns an error
// - Cancelling a non-existent job returns an error
//
// RetryJob: (after completing Task 2)
// - Valid retry works
// - Retrying a non-failed job returns an error
// - Retrying when max retries reached returns an error
//
// Requirements:
// - Mock JobsRepository and KafkaProducer interfaces
// - Use table-driven tests where appropriate
// - Verify the correct Kafka message is published for cancellations
