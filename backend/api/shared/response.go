package shared

import (
	"encoding/json"
	"net/http"
)

// Response represents the standard API response format
type Response struct {
	Status string      `json:"status"`
	Data   interface{} `json:"data,omitempty"`
	Error  string      `json:"error,omitempty"`
}

// RespondJSON sends a JSON response with the given status code and data
func RespondJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := Response{
		Status: "success",
		Data:   data,
	}

	json.NewEncoder(w).Encode(response)
}

// RespondError sends a JSON error response with the given status code and error message
func RespondError(w http.ResponseWriter, statusCode int, err error) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := Response{
		Status: "error",
		Error:  err.Error(),
	}

	json.NewEncoder(w).Encode(response)
}

// RespondErrorMessage sends a JSON error response with the given status code and message
func RespondErrorMessage(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := Response{
		Status: "error",
		Error:  message,
	}

	json.NewEncoder(w).Encode(response)
}
