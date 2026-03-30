package jobs

import (
	"errors"
	"net/http"

	"github.com/fullstack-assessment/backend/api/shared"
	"github.com/fullstack-assessment/backend/services"
	"github.com/gorilla/mux"
)

// getJob handles GET /api/v1/jobs/{id}
func (h *Handler) getJob(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	if id == "" {
		shared.RespondErrorMessage(w, http.StatusBadRequest, "job ID is required")
		return
	}

	job, err := h.service.GetJob(r.Context(), id)
	if err != nil {
		if errors.Is(err, services.ErrJobNotFound) {
			shared.RespondErrorMessage(w, http.StatusNotFound, "job not found")
			return
		}
		shared.RespondError(w, http.StatusInternalServerError, err)
		return
	}

	shared.RespondJSON(w, http.StatusOK, job)
}
