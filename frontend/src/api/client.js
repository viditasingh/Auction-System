import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("authToken");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export const auctionAPI = {
  // RFQ Endpoints
  getRFQs: (params = {}) => apiClient.get("/rfqs/", { params }),
  getRFQ: (id) => apiClient.get(`/rfqs/${id}/`),
  createRFQ: (data) => apiClient.post("/rfqs/", data),
  updateRFQ: (id, data) => apiClient.put(`/rfqs/${id}/`, data),
  deleteRFQ: (id) => apiClient.delete(`/rfqs/${id}/`),
  activateRFQ: (id) => apiClient.post(`/rfqs/${id}/activate/`),
  closeRFQ: (id) => apiClient.post(`/rfqs/${id}/close/`),
  getRFQBids: (id) => apiClient.get(`/rfqs/${id}/bids/`),
  getRFQEvents: (id) => apiClient.get(`/rfqs/${id}/events/`),
  getRFQExtensionHistory: (id) =>
    apiClient.get(`/rfqs/${id}/extension-history/`),
  getRFQStatistics: (id) => apiClient.get(`/rfqs/${id}/statistics/`),

  // Bid Endpoints
  getBids: (params = {}) => apiClient.get("/bids/", { params }),
  getBid: (id) => apiClient.get(`/bids/${id}/`),
  submitBid: (data) => apiClient.post("/bids/", data),

  // Event Endpoints
  getEvents: (params = {}) => apiClient.get("/events/", { params }),

  // Extension History Endpoints
  getExtensionHistory: (params = {}) =>
    apiClient.get("/extension-history/", { params }),
};

export default apiClient;
