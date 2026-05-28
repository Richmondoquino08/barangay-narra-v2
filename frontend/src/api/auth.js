import api from './apiClient';

export function login(credentials) {
  return api.post('/auth/login', credentials).then((res) => res.data);
}

export function fetchProfile() {
  return api.get('/auth/me').then((res) => res.data);
}
