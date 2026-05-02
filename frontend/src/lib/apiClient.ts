import axios from 'axios';
import { auth } from './firebase';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use(async (config) => {
  // Don't override an explicitly provided Authorization header (e.g. login /sync)
  const hasAuth =
    config.headers?.Authorization ||
    config.headers?.authorization ||
    (config.headers?.has && config.headers.has('Authorization'));

  if (hasAuth) {
    return config;
  }

  const devEmail = typeof window !== 'undefined' ? localStorage.getItem('devUserEmail') : null;

  if (devEmail) {
    // Dev mode takes priority over Firebase auth
    config.headers.Authorization = 'Bearer dev';
    config.headers['x-dev-mode'] = 'true';
    config.headers['x-dev-user-email'] = devEmail;
  } else if (auth?.currentUser) {
    const token = await auth.currentUser.getIdToken(true);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
