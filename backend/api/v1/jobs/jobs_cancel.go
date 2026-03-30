package jobs

import (
	"errors"
	"net/http"

	"github.com/fullstack-assessment/backend/api/shared"
	"github.com/fullstack-assessment/backend/services"
	"github.com/gorilla/mux"
)

// cancelJob handles POST /api/v1/jobs/{id}/cancel
func (h *Handler) cancelJob(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if id == "" {
		shared.RespondErrorMessage(w, http.StatusBadRequest, "job ID is required")
		return
	}

	job, err := h.service.CancelJob(r.Context(), id)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrJobNotFound):
			shared.RespondError(w, http.StatusNotFound, err)
		case errors.Is(err, services.ErrInvalidJobState):
			shared.RespondError(w, http.StatusConflict, err)
		default:
			shared.RespondError(w, http.StatusInternalServerError, err)
		}
		return
	}

	shared.RespondJSON(w, http.StatusOK, job)
}

// retryJob handles POST /api/v1/jobs/{id}/retry
func (h *Handler) retryJob(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if id == "" {
		shared.RespondErrorMessage(w, http.StatusBadRequest, "job ID is required")
		return
	}

	job, err := h.service.RetryJob(r.Context(), id)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrJobNotFound):
			shared.RespondError(w, http.StatusNotFound, err)
		case errors.Is(err, services.ErrInvalidJobState), errors.Is(err, services.ErrMaxRetriesReached):
			shared.RespondError(w, http.StatusConflict, err)
		default:
			shared.RespondError(w, http.StatusInternalServerError, err)
		}
		return
	}

	shared.RespondJSON(w, http.StatusOK, job)
}
