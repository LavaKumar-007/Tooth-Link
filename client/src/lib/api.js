import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor attaches JWT bearer token from sessionStorage
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("toothlink_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Response interceptor handles session expiration (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== "/login" && currentPath !== "/register" && currentPath !== "/") {
        sessionStorage.removeItem("toothlink_token");
        sessionStorage.removeItem("toothlink_user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
