package jobs

import (
	"net/http"
	"strconv"

	"github.com/fullstack-assessment/backend/api/shared"
	"github.com/fullstack-assessment/backend/services"
)

// ListJobsResponse represents the response for listing jobs
type ListJobsResponse struct {
	Jobs  interface{} `json:"jobs"`
	Total int64       `json:"total"`
	Page  int         `json:"page"`
	Limit int         `json:"limit"`
}

// listJobs handles GET /api/v1/jobs
func (h *Handler) listJobs(w http.ResponseWriter, r *http.Request) {
	// Parse query parameters
	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 || limit > 100 {
		limit = 10
	}

	filter := services.JobFilter{
		Page:  page,
		Limit: limit,
	}

	jobs, total, err := h.service.ListJobs(r.Context(), filter)
	if err != nil {
		shared.RespondError(w, http.StatusInternalServerError, err)
		return
	}

	response := ListJobsResponse{
		Jobs:  jobs,
		Total: total,
		Page:  page,
		Limit: limit,
	}

	shared.RespondJSON(w, http.StatusOK, response)
}
