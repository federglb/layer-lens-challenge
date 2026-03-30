// Job types
export type JobType = 'process' | 'analyze' | 'export';

// Job statuses
export type JobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelling'
  | 'cancelled';

// Job model
export interface Job {
  id: string;
  name: string;
  jobType: JobType;
  status: JobStatus;
  config?: Record<string, unknown>;
  errorMessage?: string;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

// API response wrapper
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
}

// Create job request
export interface CreateJobRequest {
  name: string;
  job_type: string;
  config?: Record<string, unknown>;
}

// List jobs response
export interface JobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
}

// Helper to check if a job can be cancelled
export function canBeCancelled(job: Job): boolean {
  return job.status === 'pending' || job.status === 'processing';
}

// Helper to check if a job can be retried
export function canBeRetried(job: Job): boolean {
  return job.status === 'failed' && job.retryCount < 3;
}

// Helper to check if a job is in a terminal state
export function isTerminalStatus(status: JobStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}
