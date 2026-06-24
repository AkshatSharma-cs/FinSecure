import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Header.css';

function Header() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-brand">Fin<span>Secure</span></div>

      <nav className="header-nav">
        <NavLink to="/" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')} end>
          Dashboard
        </NavLink>
        <NavLink to="/accounts" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          Accounts
        </NavLink>
        <NavLink to="/cards" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          Cards
        </NavLink>
        <NavLink to="/loans" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          Loans
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
          Profile
        </NavLink>
      </nav>

      <div className="header-right">
        <span className="header-user">Hello, {user.firstName || user.username || 'Customer'}</span>
        <button className="btn-logout" onClick={handleLogout}>Sign Out</button>
      </div>
    </header>
  );
}

export default Header;
