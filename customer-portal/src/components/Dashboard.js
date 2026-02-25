import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Header from './Header';
import { customerAPI } from '../api';
import './Dashboard.css';

const BANNERS = [
  { id: 1, title: 'Signature Credit Card', subtitle: 'Unlimited lounge access + 5x rewards. Apply now!', cta: 'Apply Now', ctaLink: '/cards', bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', accent: '#fbbf24', icon: '✈️' },
  { id: 2, title: '0% EMI on Electronics', subtitle: 'Shop on Amazon & Flipkart with your Gold card. No extra cost.', cta: 'Explore Offers', ctaLink: '/cards', bg: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)', accent: '#fef3c7', icon: '🛍️' },
  { id: 3, title: 'Home Loan @ 8.5% p.a.', subtitle: 'Turn your dream home into reality. Fast approval. Low EMI.', cta: 'Apply for Loan', ctaLink: '/loans', bg: 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)', accent: '#a7f3d0', icon: '🏠' },
  { id: 4, title: 'Virtual Cards — Instant!', subtitle: 'Shop online safely. Get a virtual card in seconds.', cta: 'Get Virtual Card', ctaLink: '/cards', bg: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)', accent: '#bfdbfe', icon: '🔒' },
  { id: 5, title: 'Refer & Earn ₹500', subtitle: 'Invite friends to FinSecure. Get ₹500 credit per referral.', cta: 'Refer Now', ctaLink: '/profile', bg: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 100%)', accent: '#e9d5ff', icon: '🎁' },
];

function BannerCarousel() {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef(null);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setCurrent(c => (c + 1) % BANNERS.length);
    }, 4000);
  };

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, []);

  const goTo = (i) => {
    clearInterval(timerRef.current);
    setCurrent(i);
    startTimer();
  };

  const b = BANNERS[current];

  return (
    <div className="banner-carousel" style={{ background: b.bg }}>
      <div className="banner-content">
        <div className="banner-icon">{b.icon}</div>
        <div className="banner-text">
          <div className="banner-title">{b.title}</div>
          <div className="banner-subtitle">{b.subtitle}</div>
        </div>
        <Link to={b.ctaLink} className="banner-cta" style={{ background: b.accent, color: '#1a202c' }}>
          {b.cta} →
        </Link>
      </div>
      <div className="banner-dots">
        {BANNERS.map((_, i) => (
          <button key={i} className={`banner-dot ${i === current ? 'active' : ''}`} onClick={() => goTo(i)} />
        ))}
      </div>
      <div className="banner-progress">
        <div key={current} className="banner-progress-bar" />
      </div>
    </div>
  );
}

function Dashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAccount, setDepositAccount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDesc, setDepositDesc] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState('');

  useEffect(() => { loadDashboard(); }, []);

  const loadDashboard = async () => {
    try {
      const res = await customerAPI.getDashboard();
      setDashboard(res.data.data);
    } catch {
      setError('Failed to load dashboard. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!depositAccount || !depositAmount) return;
    setDepositing(true);
    try {
      await customerAPI.deposit({ accountNumber: depositAccount, amount: parseFloat(depositAmount), description: depositDesc || 'Self deposit' });
      setDepositSuccess(`₹${parseFloat(depositAmount).toLocaleString('en-IN')} deposited successfully!`);
      setShowDepositModal(false);
      setDepositAmount(''); setDepositDesc('');
      loadDashboard();
    } catch (e) {
      setError(e.response?.data?.message || 'Deposit failed');
    } finally {
      setDepositing(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) return <><Header /><div className="loading">Loading your dashboard...</div></>;

  return (
    <>
      <Header />
      <div className="page-container">
        <div className="dashboard-top">
          <h1 className="page-title">Welcome back, {dashboard?.profile?.firstName || 'Customer'} 👋</h1>
          <button className="btn-deposit" onClick={() => setShowDepositModal(true)}>+ Deposit Cash</button>
        </div>

        {depositSuccess && <div className="success-msg">{depositSuccess}<button onClick={() => setDepositSuccess('')} style={{marginLeft:8,background:'none',border:'none',cursor:'pointer'}}>✕</button></div>}
        {error && <div className="error-msg">{error}</div>}

        {dashboard?.profile?.kycStatus !== 'APPROVED' && (
          <div className="kyc-banner">
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div className="kyc-banner-text">
              <strong>KYC Verification Pending</strong> — Complete your KYC to unlock all banking features.
              <Link to="/profile" style={{ color: '#d97706', marginLeft: 8, fontWeight: 600 }}>Complete KYC →</Link>
            </div>
          </div>
        )}

        {/* Rotating Banner */}
        <BannerCarousel />

        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Balance</div>
            <div className="stat-value">{formatCurrency(dashboard?.totalBalance)}</div>
            <div className="stat-sub">Across all accounts</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Accounts</div>
            <div className="stat-value">{dashboard?.totalAccounts || 0}</div>
            <div className="stat-sub">Active accounts</div>
          </div>
          <div className="stat-card purple">
            <div className="stat-label">Active Loans</div>
            <div className="stat-value">{dashboard?.activeLoans || 0}</div>
            <div className="stat-sub">Running loans</div>
          </div>
          <div className="stat-card orange">
            <div className="stat-label">Notifications</div>
            <div className="stat-value">{dashboard?.unreadNotifications || 0}</div>
            <div className="stat-sub">Unread alerts</div>
          </div>
        </div>

        {/* Accounts */}
        <div className="section-card">
          <div className="section-header">
            <span className="section-title">Your Accounts</span>
            <Link to="/accounts" className="btn-sm">View All</Link>
          </div>
          {dashboard?.accounts?.length > 0 ? dashboard.accounts.map(acc => (
            <div className="account-row" key={acc.id}>
              <div>
                <div className="account-type">{acc.accountType.replace('_', ' ')}</div>
                <div className="account-number">{acc.accountNumber} • {acc.ifscCode}</div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="account-balance">{formatCurrency(acc.balance)}</div>
                <button className="btn-sm btn-deposit-mini" onClick={() => { setDepositAccount(acc.accountNumber); setShowDepositModal(true); }}>+ Deposit</button>
                <Link to={`/transactions/${acc.id}`} className="btn-sm" style={{ fontSize: 12 }}>Transactions</Link>
              </div>
            </div>
          )) : (
            <div className="empty-state">No accounts found. <Link to="/accounts">Open an account</Link></div>
          )}
        </div>

        {/* Quick Links */}
        <div className="quick-links">
          <Link to="/cards" className="quick-link-card">💳 <span>Cards</span></Link>
          <Link to="/loans" className="quick-link-card">📋 <span>Loans</span></Link>
          <Link to="/profile" className="quick-link-card">👤 <span>Profile & KYC</span></Link>
        </div>

        {/* Recent Transactions */}
        <div className="section-card">
          <div className="section-header">
            <span className="section-title">Recent Transactions</span>
          </div>
          {dashboard?.recentTransactions?.length > 0 ? dashboard.recentTransactions.map(txn => (
            <div className="txn-row" key={txn.id}>
              <div>
                <div className="txn-desc">{txn.description || txn.mode}</div>
                <div className="txn-ref">{txn.referenceNumber} • {formatDate(txn.createdAt)}</div>
              </div>
              <div className={`txn-amount ${txn.type.toLowerCase()}`}>
                {txn.type === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
              </div>
            </div>
          )) : (
            <div className="empty-state">No recent transactions</div>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="modal-overlay" onClick={() => setShowDepositModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <h3>Deposit Cash</h3>
            <div className="modal-field">
              <label>Account</label>
              <select value={depositAccount} onChange={e => setDepositAccount(e.target.value)}>
                <option value="">-- Select account --</option>
                {dashboard?.accounts?.map(acc => (
                  <option key={acc.id} value={acc.accountNumber}>
                    {acc.accountNumber} ({acc.accountType}) — {formatCurrency(acc.balance)}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-field">
              <label>Amount (₹100 – ₹1,00,00,000)</label>
              <input type="number" min="100" placeholder="e.g. 10000" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} />
            </div>
            <div className="modal-field">
              <label>Description (optional)</label>
              <input type="text" placeholder="e.g. Monthly savings" value={depositDesc} onChange={e => setDepositDesc(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDepositModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={depositing || !depositAccount || !depositAmount} onClick={handleDeposit}>
                {depositing ? 'Depositing...' : 'Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Dashboard;
