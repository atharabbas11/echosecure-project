import axios from "axios";
import { useAuthStore } from "../store/useAuthStore"; // Import the auth store

// const localIP = "http://localhost:3000/api";

// export const axiosInstance = axios.create({
//   baseURL: import.meta.env.MODE === "development" ? `${localIP}` : "/api",
//   withCredentials: true,
// });


export const axiosInstance = axios.create({
  // baseURL: import.meta.env.MODE === "development" ? `${localIP}` : "/api",
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});


const getCSRFTokenWithRetry = async () => {
  let retries = 3;
  while (retries > 0) {
    const csrfToken = document.cookie
      .split('; ')
      .find((row) => row.startsWith('csrfToken='))
      ?.split('=')[1];
      if (csrfToken) {
        console.log('CSRF Token found:', csrfToken);
        return csrfToken;
      }
    retries--;
    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms
  }
  return null;
};

axiosInstance.interceptors.request.use(async (config) => {
  console.log('All Cookies:', document.cookie);
  const csrfToken = await getCSRFTokenWithRetry();

  if (csrfToken) {
    config.headers['x-csrf-token'] = csrfToken;
  } else {
    console.error('CSRF token not found in cookies');
  }

  return config;
});

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if the error is due to an expired access token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const success = await useAuthStore.getState().refreshToken();
        if (success) {
          // Retry the original request with the new token
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // If refresh fails, log the user out
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Add a method for file uploads
axiosInstance.uploadFile = async (url, formData) => {
  return axiosInstance.post(url, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
