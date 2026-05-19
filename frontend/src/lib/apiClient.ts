import axios from 'axios';
import { auth } from './firebase';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
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
  const devToken = typeof window !== 'undefined' ? localStorage.getItem('devToken') : null;
  const devSecret = process.env.NEXT_PUBLIC_DEV_SECRET;

  if (devEmail && devToken) {
    config.headers.Authorization = `Bearer ${devToken}`;
    config.headers['x-dev-mode'] = 'true';
    config.headers['x-dev-user-email'] = devEmail;
    if (devSecret) {
      config.headers['x-dev-secret'] = devSecret;
    }
  } else if (auth?.currentUser) {
    const token = await auth.currentUser.getIdToken(true);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
