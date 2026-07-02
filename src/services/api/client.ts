import axios from 'axios';
import { API_URL } from '../../constants/config';

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});
