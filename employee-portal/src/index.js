import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { DEMO_MODE, seedDemoSession } from './mockData';

if (DEMO_MODE) {
  seedDemoSession();
  if (window.location.pathname === '/login') {
    window.history.replaceState({}, '', '/');
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
