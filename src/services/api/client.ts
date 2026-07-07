import axios from 'axios';
import { API_URL, API_TIMEOUT } from '@constants/config';
import { attachInterceptors } from './interceptors';

// Instance Axios duy nhất của app. Mọi HTTP call đi qua đây — không dùng fetch/axios trực tiếp ở nơi khác.
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: '*/*',
  },
});

attachInterceptors(apiClient);
