import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import CustomerManagement from './components/CustomerManagement';
import KYCVerification from './components/KYCVerification';
import LoanApprovals from './components/LoanApprovals';
import ManageEmployees from './components/ManageEmployees';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!token || !['ROLE_EMPLOYEE', 'ROLE_ADMIN'].includes(user.role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!token || user.role !== 'ROLE_ADMIN') {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/customers" element={<PrivateRoute><CustomerManagement /></PrivateRoute>} />
        <Route path="/kyc" element={<PrivateRoute><KYCVerification /></PrivateRoute>} />
        <Route path="/loans" element={<PrivateRoute><LoanApprovals /></PrivateRoute>} />
        <Route path="/employees" element={<AdminRoute><ManageEmployees /></AdminRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;