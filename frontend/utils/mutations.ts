import api from "./api";
import { Job, CreateJobRequest, ApiResponse } from "./interfaces";

/**
 * Create a new job
 * @param data - Job creation data
 */
export async function createJob(data: CreateJobRequest): Promise<Job> {
  try {
    const response = await api.post<ApiResponse<Job>>("/api/v1/jobs", data);

    if (response.data.status === "error") {
      throw new Error(response.data.error || "Failed to create job");
    }

    return response.data.data!;
  } catch (error: any) {
    console.error(
      "Failed to create job:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

/**
 * Cancel a job
 * @param id - Job ID to cancel
 */
export async function cancelJob(id: string): Promise<Job> {
  try {
    const response = await api.post<ApiResponse<Job>>(
      `/api/v1/jobs/${id}/cancel`,
    );

    if (response.data.status === "error") {
      throw new Error(response.data.error || "Failed to cancel job");
    }

    return response.data.data!;
  } catch (error: any) {
    console.error(
      "Failed to cancel job:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

/**
 * Retry a failed job
 * @param id - Job ID to retry
 */
export async function retryJob(id: string): Promise<Job> {
  try {
    const response = await api.post<ApiResponse<Job>>(
      `/api/v1/jobs/${id}/retry`,
    );

    if (response.data.status === "error") {
      throw new Error(response.data.error || "Failed to retry job");
    }

    return response.data.data!;
  } catch (error: any) {
    console.error(
      "Failed to retry job:",
      error.response?.data || error.message,
    );
    throw error;
  }
}
