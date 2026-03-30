package jobs

import (
	"github.com/fullstack-assessment/backend/services"
	"github.com/gorilla/mux"
)

// Handler handles HTTP requests for jobs
type Handler struct {
	service services.JobsService
}

// NewHandler creates a new jobs handler
func NewHandler(service services.JobsService) *Handler {
	return &Handler{
		service: service,
	}
}

// RegisterRoutes registers the job routes
func (h *Handler) RegisterRoutes(router *mux.Router) {
	jobsRouter := router.PathPrefix("/jobs").Subrouter()

	jobsRouter.HandleFunc("", h.listJobs).Methods("GET", "OPTIONS")
	jobsRouter.HandleFunc("", h.createJob).Methods("POST", "OPTIONS")
	jobsRouter.HandleFunc("/{id}", h.getJob).Methods("GET", "OPTIONS")
	jobsRouter.HandleFunc("/{id}/cancel", h.cancelJob).Methods("POST", "OPTIONS")
	jobsRouter.HandleFunc("/{id}/retry", h.retryJob).Methods("POST", "OPTIONS")
}
