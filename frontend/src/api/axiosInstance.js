import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: `http://${window.location.hostname}:5001/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor to inject the token from localStorage
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cms_token') || sessionStorage.getItem('cms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
