import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://tender-vision-production-5ef6.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) { localStorage.clear(); window.location.href = '/login'; }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
};

export const employeeAPI = {
  getDashboard: () => api.get('/employee/dashboard'),
  getCustomers: (page = 0, search = '', sort = 'createdAt', dir = 'desc') => api.get(`/employee/customers?page=${page}&size=20&sort=${sort}&dir=${dir}${search ? '&search=' + search : ''}`),
  getCustomerByAccount: (accountNumber) => api.get(`/employee/customers/by-account?accountNumber=${accountNumber}`),
  getPendingKyc: (page = 0) => api.get(`/employee/kyc/pending?page=${page}&size=20`),
  verifyKyc: (data) => api.post('/employee/kyc/verify', data),
  getPendingLoans: (page = 0) => api.get(`/employee/loans/pending?page=${page}&size=20`),
  reviewLoan: (loanId, action, rejectionReason) => api.post(`/employee/loans/${loanId}/review`, { action, rejectionReason }),
  depositToAccount: (data) => api.post('/employee/customers/deposit', data),
  // Admin only
  getAllEmployees: () => api.get('/employee/list'),
  createEmployee: (data) => api.post('/employee/create', data),
  deleteEmployee: (id) => api.delete(`/employee/${id}`),
};

export default api;