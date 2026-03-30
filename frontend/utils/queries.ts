import api from './api';
import { Job, JobsResponse, ApiResponse } from './interfaces';

/**
 * Fetch a paginated list of jobs
 * @param page - Page number (1-indexed)
 * @param limit - Number of items per page (default: 10, max: 100)
 */
export async function fetchJobs(
  page: number = 1,
  limit: number = 10
): Promise<JobsResponse> {
  const response = await api.get<ApiResponse<JobsResponse>>('/api/v1/jobs', {
    params: { page, limit },
  });

  if (response.data.status === 'error') {
    throw new Error(response.data.error || 'Failed to fetch jobs');
  }

  return response.data.data!;
}

/**
 * Fetch a single job by ID
 * @param id - Job ID
 */
export async function fetchJob(id: string): Promise<Job> {
  const response = await api.get<ApiResponse<Job>>(`/api/v1/jobs/${id}`);

  if (response.data.status === 'error') {
    throw new Error(response.data.error || 'Failed to fetch job');
  }

  return response.data.data!;
}

// Query keys for TanStack Query
export const queryKeys = {
  jobs: (page: number, limit: number) => ['jobs', { page, limit }] as const,
  job: (id: string) => ['job', id] as const,
};
