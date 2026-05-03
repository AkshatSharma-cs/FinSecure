import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://tender-vision-production-5ef6.up.railway.app/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  sendOtp: (data) => api.post('/auth/otp/send', data),
  verifyOtp: (data) => api.post('/auth/otp/verify', data),
  forgotPassword: (email) => api.post(`/auth/forgot-password?email=${encodeURIComponent(email)}`),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

// Customer APIs
export const customerAPI = {
  getProfile: () => api.get('/customer/profile'),
  getDashboard: () => api.get('/customer/dashboard'),
  createAccount: (data) => api.post('/customer/accounts', data),
  transfer: (data) => api.post('/customer/transactions/transfer', data),
  getTransactions: (accountId, page = 0, filters = {}) => {
    const params = new URLSearchParams({ page, size: 20 });
    if (filters.type)      params.append('type', filters.type);
    if (filters.fromDate)  params.append('fromDate', filters.fromDate);
    if (filters.toDate)    params.append('toDate', filters.toDate);
    if (filters.minAmount) params.append('minAmount', filters.minAmount);
    if (filters.maxAmount) params.append('maxAmount', filters.maxAmount);
    return api.get(`/customer/transactions/${accountId}?${params.toString()}`);
  },
  downloadStatement: (accountId, months = 3) =>
    api.get(`/customer/transactions/${accountId}/statement?months=${months}`, { responseType: 'blob' }),
  getLoans: () => api.get('/customer/loans'),
  applyLoan: (data) => api.post('/customer/loans/apply', data),
  getCards: () => api.get('/customer/cards'),
  deposit: (data) => api.post('/customer/accounts/deposit', data),
  issueDebitCard: (accountId) => api.post(`/customer/cards/${accountId}/issue-debit`),
  issueVirtualDebitCard: (accountId) => api.post(`/customer/cards/${accountId}/issue-virtual-debit`),
  issueCreditCard: (data) => api.post('/customer/cards/issue-credit', data),
  issuePrepaidCard: (data) => api.post('/customer/cards/issue-prepaid', data),
  cardAction: (data) => api.post('/customer/cards/action', data),
  uploadKyc: (data) => api.post('/customer/kyc/upload', data),
  getKycDocuments: () => api.get('/customer/kyc/documents'),
  getNotifications: (page = 0) => api.get(`/customer/notifications?page=${page}&size=10`),
  markNotificationsRead: () => api.post('/customer/notifications/read-all'),
};

export default api;
