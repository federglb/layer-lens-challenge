# Full Stack Technical Assessment

Welcome! This assessment evaluates your ability to work with a modern full-stack application. You'll work on a **Job Processing System** - a simplified service where users submit background jobs that get processed asynchronously.

## Tech Stack

- **Backend:** Go 1.21+, Gorilla Mux, MongoDB
- **Message Queue:** Apache Kafka
- **Frontend:** Nodejs v22, Next.js 14, TypeScript, TanStack Query, TailwindCSS

## Getting Started

### Prerequisites
- Docker and Docker Compose installed
- Git

### Setup (One Command)

```bash
git clone <repository-url>
cd fullstack-assessment
docker compose up -d
```

Wait ~30 seconds for all services to initialize. Then:
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080
- **MongoDB:** localhost:27017
- **Kafka:** localhost:9092

### Local Development (Optional)

If you prefer hot-reloading:

```bash
# Terminal 1 - Infrastructure only
docker compose up mongodb kafka kafka-init worker -d

# Terminal 2 - Backend
cd backend
go run main.go

# Terminal 3 - Frontend
cd frontend
npm install
npm run dev
```

---

## How the System Works

1. Users create **Jobs** with a name, type, and configuration
2. Backend validates the job and publishes it to Kafka topic `jobs`
3. A worker service consumes jobs and processes them (simulated 2-5 second delay)
4. Job status transitions: `pending` → `processing` → `completed` or `failed`
5. Users can cancel jobs that are `pending` or `processing`

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/jobs` | List all jobs (supports `?page=1&limit=10`) |
| GET | `/api/v1/jobs/{id}` | Get a single job |
| POST | `/api/v1/jobs` | Create a new job |
| POST | `/api/v1/jobs/{id}/cancel` | Cancel a job (Task 2) |
| POST | `/api/v1/jobs/{id}/retry` | Retry a failed job (Task 2) |

### Job Types
- `process` - General processing job
- `analyze` - Data analysis job
- `export` - Data export job

### Job Statuses
- `pending` - Waiting to be picked up
- `processing` - Currently being processed
- `completed` - Successfully finished
- `failed` - Processing failed
- `cancelling` - Cancel requested
- `cancelled` - Successfully cancelled

---

## Your Tasks

Complete the following three tasks. Aim for **3-4 hours total**.

### Task 1: Bug Fix (45-60 minutes)

There are two bugs in the system:

**Bug A - Backend:**
When creating a job with an invalid `job_type` (e.g., "invalid" instead of "process", "analyze", or "export"), the API returns `500 Internal Server Error` instead of `400 Bad Request`.

**Bug B - Frontend:**
When job creation fails, the error message is not shown to the user. Check the browser console - you'll see the error logged, but the UI shows nothing.

**Your task:**
1. Find and fix both bugs
2. Ensure invalid job types return 400 with a clear error message
3. Ensure the frontend displays error messages to the user

---

### Task 2: Job Cancellation & Dead Letter Queue (60-90 minutes)

Implement job cancellation and a retry mechanism for failed jobs.

**Part A: Job Cancellation**

1. **Backend endpoint:** `POST /api/v1/jobs/{id}/cancel`
   - Validate the job exists
   - Validate the job is in `pending` or `processing` state
   - Return `409 Conflict` if job is already `completed`, `failed`, or `cancelled`
   - Publish a cancellation message to Kafka topic `job_cancellations`:
     ```json
     { "job_id": "xxx", "cancelled_at": "2024-01-15T10:30:00Z" }
     ```
   - Update job status to `cancelling` in the database
   - Return the updated job

**Part B: Dead Letter Queue & Retry**

When jobs fail, they're published to a Dead Letter Queue (`jobs_dlq`). Implement retry functionality:

2. **Backend endpoint:** `POST /api/v1/jobs/{id}/retry`
   - Only jobs with status `failed` can be retried
   - Reset job status to `pending`
   - Increment `retry_count` field
   - Re-publish job to `jobs` topic
   - Limit retries to 3 attempts maximum
   - Return the updated job

3. **Frontend:**
   - Cancel button for `pending`/`processing` jobs
   - Retry button for `failed` jobs (show retry count)

**Kafka producer** is already available:
```go
// In services/kafka_producer.go
func (p *KafkaProducer) Publish(ctx context.Context, topic string, message interface{}) error
```

**Note:** The worker service already handles cancellations and publishes failed jobs to the DLQ.

---

### Task 3: Write Unit Tests (45-60 minutes)

Write unit tests for `backend/services/jobs_service.go`.

**Test file:** `backend/services/jobs_service_test.go` (empty file provided)

**Test the following scenarios:**

**CreateJob:**
- Valid input creates a job successfully
- Invalid `job_type` returns an error
- Missing required field `name` returns an error

**GetJob:**
- Existing job is returned
- Non-existent job returns a not-found error

**CancelJob:** (after completing Task 2)
- Valid cancellation works
- Cancelling a `completed` job returns an error
- Cancelling a non-existent job returns an error

**Requirements:**
- Mock `JobsRepository` and `KafkaProducer` interfaces
- Use table-driven tests where appropriate
- Verify the correct Kafka message is published for cancellations

---

### Bonus Task: Real-Time Status Updates (Optional)

**If you finish early and want to go further:**

Currently, users must refresh to see job status changes. Implement real-time updates using either:
- **Polling:** Use TanStack Query's `refetchInterval` to poll while job is active
- **SSE:** Add a streaming endpoint and use `EventSource` on frontend

This is completely optional but demonstrates initiative. Don't attempt this unless Tasks 1-3 are complete and polished.

---

## Project Structure

```
fullstack-assessment/
├── backend/
│   ├── api/v1/jobs/          # HTTP handlers
│   ├── services/             # Business logic (write tests here)
│   ├── repositories/         # Database access
│   └── models/               # Data structures
├── worker/                   # Pre-built - don't modify
├── frontend/
│   ├── app/                  # Next.js App Router
│   ├── components/           # Your components go here (empty)
│   └── utils/                # API calls, types (fix bug here)
└── docker-compose.yml
```

---

## What's Already Done For You

- Docker Compose with all services configured (including Kafka topics)
- Go API structure with handler/service/repository pattern
- Kafka producer helper
- Worker that processes jobs
- Next.js 14 with App Router, TanStack Query, and TailwindCSS configured
- All TypeScript interfaces defined
- API query and mutation functions (in `utils/`)
- Empty `components/` directory ready for your UI

## Frontend UI Requirements

**You design the UI.** No mockups are provided. Your UI should demonstrate:

1. **Responsive Design** - Works on desktop (1200px+) and mobile (375px+)
2. **Visual Cohesion** - Consistent colors, spacing, typography, and component styling
3. **Good UX** - Loading states, error feedback, clear actions
4. **Next.js Best Practices** - Proper use of App Router, client/server components where appropriate

We're evaluating your ability to create a polished, professional interface - not just functional code.

---

## Evaluation Criteria

We're looking for:

1. **Code Quality**
   - Clean, readable code
   - Follows existing patterns in the codebase
   - Proper error handling

2. **Problem Solving**
   - Correct identification and fix of bugs
   - Thoughtful implementation of new features

3. **Testing**
   - Meaningful test coverage
   - Edge cases considered
   - Proper use of mocks

4. **UI Design**
   - Responsive and cohesive design
   - Good user experience
   - Professional appearance

5. **Communication**
   - Clear PR descriptions
   - Any assumptions documented

---

## Submission

1. Complete tasks on separate branches:
   - `task-1/bug-fix`
   - `task-2/job-cancellation`
   - `task-3/unit-tests`

2. Create a Pull Request for each task with:
   - Brief description of your changes
   - Any assumptions you made
   - How to test your changes
   - Approximate time spent

3. Share repository access with: [email to be provided]

---

## Questions?

If you have questions about requirements or encounter technical issues, email us.

Asking clarifying questions is encouraged and will not affect your evaluation.

---

## Tips

- Read through the existing code first to understand the patterns
- The worker logs are helpful for debugging Kafka messages
- Use `docker compose logs -f backend` to see API logs
- Use `docker compose logs -f worker` to see worker processing
- The frontend has React Query DevTools enabled (bottom-left corner)

Good luck!
