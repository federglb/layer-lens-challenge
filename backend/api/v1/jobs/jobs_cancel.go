package jobs

import (
	"net/http"

	"github.com/fullstack-assessment/backend/api/shared"
	"github.com/gorilla/mux"
)

// cancelJob handles POST /api/v1/jobs/{id}/cancel
// NOTE: This is a skeleton - candidate should implement the service method
func (h *Handler) cancelJob(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if id == "" {
		shared.RespondErrorMessage(w, http.StatusBadRequest, "job ID is required")
		return
	}

	job, err := h.service.CancelJob(r.Context(), id)
	if err != nil {
		// TODO: Candidate should add proper error handling here
		// - 404 for job not found
		// - 409 for job that cannot be cancelled (wrong state)
		// - 500 for internal errors
		shared.RespondError(w, http.StatusInternalServerError, err)
		return
	}

	shared.RespondJSON(w, http.StatusOK, job)
}

// retryJob handles POST /api/v1/jobs/{id}/retry
// NOTE: This is a skeleton - candidate should implement the service method
func (h *Handler) retryJob(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if id == "" {
		shared.RespondErrorMessage(w, http.StatusBadRequest, "job ID is required")
		return
	}

	job, err := h.service.RetryJob(r.Context(), id)
	if err != nil {
		// TODO: Candidate should add proper error handling here
		// - 404 for job not found
		// - 409 for job that cannot be retried (wrong state or max retries reached)
		// - 500 for internal errors
		shared.RespondError(w, http.StatusInternalServerError, err)
		return
	}

	shared.RespondJSON(w, http.StatusOK, job)
}
