import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach Bearer token to all requests if present in localStorage or sessionStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('eom_auth_token') || sessionStorage.getItem('eom_auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 Unauthorized globally (e.g. token expired, revoked, or invalidated)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      const requestUrl = error.config?.url || '';
      
      if (!currentPath.includes('/login') && !requestUrl.includes('/auth/login')) {
        localStorage.removeItem('eom_auth_token');
        localStorage.removeItem('eom_user_profile');
        sessionStorage.removeItem('eom_auth_token');
        sessionStorage.removeItem('eom_user_profile');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
