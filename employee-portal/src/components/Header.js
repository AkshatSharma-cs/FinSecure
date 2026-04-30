import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Header.css';

function Header() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'ROLE_ADMIN';
  const handleLogout = () => { localStorage.clear(); navigate('/login'); };

  return (
    <header className="header">
      <div className="header-brand">
        Fin<span>Secure</span>
        <span className="header-badge">{isAdmin ? 'Admin' : 'Employee'}</span>
      </div>
      <nav className="header-nav">
        <NavLink to="/" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} end>Dashboard</NavLink>
        <NavLink to="/customers" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Customers</NavLink>
        <NavLink to="/kyc" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>KYC Verification</NavLink>
        <NavLink to="/loans" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Loan Approvals</NavLink>
        {isAdmin && (
          <NavLink to="/employees" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Employees</NavLink>
        )}
      </nav>
      <div className="header-right">
        <span className="header-user">{user.username}</span>
        <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
      </div>
    </header>
  );
}

export default Header;