# Layer Lens Challenge — Job Processing System

A full-stack job processing system built with Go, Next.js 14, Apache Kafka, and MongoDB.

## Architecture

```
lens/
├── backend/          # Go REST API (Gorilla Mux)
├── worker/           # Go Kafka consumer / job processor
├── frontend/         # Next.js 14 + TypeScript + TailwindCSS
├── db/               # MongoDB seed script
└── docker-compose.yml
```

### Services

| Service | Technology | Port |
|---|---|---|
| Frontend | Next.js 14, TanStack Query, TailwindCSS | 3000 |
| Backend API | Go 1.21, Gorilla Mux | 8080 |
| Worker | Go 1.21, kafka-go | — |
| MongoDB | MongoDB 8 | 27017 |
| Kafka | Apache Kafka 3.8 (KRaft) | 29092 |
| Redpanda Console | Kafka UI (Kowl) | 8081 |

### Kafka Topics

| Topic | Purpose |
|---|---|
| `jobs` | New job messages published by the backend |
| `job_cancellations` | Cancellation requests |
| `jobs_dlq` | Dead letter queue for failed jobs |

### How It Works

1. User creates a job via the frontend (type: `process`, `analyze`, or `export`)
2. Backend validates and persists the job in MongoDB, then publishes it to the `jobs` Kafka topic
3. Worker consumes the message, updates status to `processing`, simulates work (2–5 s), then marks it `completed` or `failed`
4. Failed jobs are published to `jobs_dlq`; the backend exposes a retry endpoint (max 3 retries)
5. Users can cancel `pending` or `processing` jobs — a message is sent to `job_cancellations` and the worker finalises the cancellation

### Job Statuses

`pending` → `processing` → `completed` / `failed` / `cancelled`

Also: `cancelling` (cancel requested, awaiting worker confirmation)

---

## Running with Docker Compose

### Prerequisites

- Docker and Docker Compose

### Start everything

```bash
docker compose up -d
```

Wait ~30 seconds for Kafka and MongoDB to initialise, then:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8080
- **Kafka UI (Redpanda Console):** http://localhost:8081
- **MongoDB:** localhost:27017

### Worker not starting?

The worker depends on `kafka-init` completing successfully (topic creation). On slower machines this can race. If the worker exits early or never connects, restart it with:

```bash
docker compose up worker --force-recreate -d
```

### Useful log commands

```bash
docker compose logs -f backend
docker compose logs -f worker
docker compose logs -f kafka-init
```

---

## Local Development (without Docker for app services)

Requires Go 1.21+ and Node.js 22+.

```bash
# Terminal 1 — infrastructure only
docker compose up mongodb kafka kafka-init -d

# Terminal 2 — backend
cd backend
go run main.go

# Terminal 3 — worker
cd worker
go run main.go

# Terminal 4 — frontend
cd frontend
npm install
npm run dev
```

Environment variables used by the backend and worker (defaults shown):

| Variable | Default |
|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/jobprocessor` |
| `KAFKA_BROKERS` | `localhost:9092` |
| `PORT` | `8080` |
| `CORS_ORIGINS` | `http://localhost:3000` |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/v1/jobs` | List jobs (`?page=1&limit=10`) |
| GET | `/api/v1/jobs/{id}` | Get a single job |
| POST | `/api/v1/jobs` | Create a job |
| POST | `/api/v1/jobs/{id}/cancel` | Cancel a pending or processing job |
| POST | `/api/v1/jobs/{id}/retry` | Retry a failed job (max 3 attempts) |

### Create Job — request body

```json
{
  "name": "My job",
  "job_type": "process",
  "config": {}
}
```

`job_type` must be one of: `process`, `analyze`, `export`.

---

## How to Test This System?

### Backend (Go)

Tests live in `backend/services/jobs_service_test.go` alongside the service layer. Run them with the standard Go toolchain:

```bash
cd backend
go test ./...
```

To run a specific package verbosely:

```bash
go test -v ./services/...
```

**What is tested (and what to add):**

The test file documents the required scenarios as TODOs. When implementing, cover:

| Function | Scenarios |
|---|---|
| `CreateJob` | Valid input creates a job; invalid `job_type` returns error; missing `name` returns error |
| `GetJob` | Existing job is returned; non-existent job returns a not-found error |
| `CancelJob` | Valid cancellation works; cancelling a `completed` job returns error; cancelling non-existent job returns error |
| `RetryJob` | Valid retry works; retrying a non-failed job returns error; retrying past max retries returns error |

**Test design requirements:**
- Mock `JobsRepository` and `KafkaProducer` interfaces — do not hit a real database or Kafka broker in unit tests
- Use table-driven tests (`[]struct{ ... }`) where multiple input/output pairs share the same logic
- Assert that the correct Kafka message is published for cancellations

### Manual / Integration Testing

With the full stack running (`docker compose up -d`), you can exercise the API directly:

```bash
# Create a job
curl -s -X POST http://localhost:8080/api/v1/jobs \
  -H "Content-Type: application/json" \
  -d '{"name":"test job","job_type":"process","config":{}}' | jq .

# List jobs
curl -s "http://localhost:8080/api/v1/jobs?page=1&limit=10" | jq .

# Cancel a job (replace <id> with an actual job ID)
curl -s -X POST http://localhost:8080/api/v1/jobs/<id>/cancel | jq .

# Retry a failed job
curl -s -X POST http://localhost:8080/api/v1/jobs/<id>/retry | jq .
```

You can also observe job lifecycle end-to-end through the frontend at http://localhost:3000 and inspect Kafka messages via the Redpanda Console at http://localhost:8081.
