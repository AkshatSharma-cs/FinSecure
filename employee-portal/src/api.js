import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

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
    const isLoginRequest = error.config?.url === '/auth/login';
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
};

export const employeeAPI = {
  getDashboard: () => api.get('/employee/dashboard'),
  getCustomers: (page = 0, search = '', sort = 'createdAt', dir = 'desc') =>
    api.get(`/employee/customers?page=${page}&size=20&sort=${sort}&dir=${dir}${search ? '&search=' + search : ''}`),
  getCustomerByAccount: (accountNumber) =>
    api.get(`/employee/customers/by-account?accountNumber=${accountNumber}`),
  getPendingKyc: (page = 0) => api.get(`/employee/kyc/pending?page=${page}&size=20`),
  verifyKyc: (data) => api.post('/employee/kyc/verify', data),
  getPendingLoans: (page = 0) => api.get(`/employee/loans/pending?page=${page}&size=20`),
  reviewLoan: (loanId, action, rejectionReason) =>
    api.post(`/employee/loans/${loanId}/review`, { action, rejectionReason }),
  depositToAccount: (data) => api.post('/employee/customers/deposit', data),

  /**
   * Fetches the PDF for a KYC document and returns a blob object URL
   * suitable for use as an <iframe> src.
   * The caller is responsible for calling URL.revokeObjectURL() on unmount.
   */
  getKycDocumentViewUrl: async (documentId) => {
    const response = await api.get(`/employee/kyc/documents/${documentId}/view`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },

  // Admin only
  getAllEmployees: () => api.get('/employee/list'),
  createEmployee: (data) => api.post('/employee/create', data),
  deleteEmployee: (id) => api.delete(`/employee/${id}`),
};

export default api;
