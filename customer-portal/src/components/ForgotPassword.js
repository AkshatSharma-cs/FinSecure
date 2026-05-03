import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api';
import './Login.css';

function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep]         = useState('email');   // 'email' | 'reset'
  const [email, setEmail]       = useState('');
  const [otp, setOtp]           = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => {
      setCountdown(p => { if (p <= 1) { clearInterval(t); return 0; } return p - 1; });
    }, 1000);
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) { setError('Please enter your email address.'); return; }
    setError(''); setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSuccess('OTP sent! Check your inbox.');
      setStep('reset');
      startCountdown();
    } catch {
      setError('Failed to send OTP. Please try again.');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setError(''); setSuccess('');
    try {
      await authAPI.forgotPassword(email);
      setSuccess('New OTP sent!');
      startCountdown();
    } catch { setError('Failed to resend OTP.'); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) { setError('Please enter the 6-digit OTP.'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({ email, otpCode: otp, newPassword: password });
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: 420 }}>

        {/* Progress */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 8 }}>
          {['Enter Email', 'Reset Password'].map((label, i) => {
            const active = (i === 0 && step === 'email') || (i === 1 && step === 'reset');
            const done   = i === 0 && step === 'reset';
            return (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
                    background: done ? '#16a34a' : active ? '#1d4ed8' : '#e5e7eb',
                    color: done || active ? 'white' : '#9ca3af' }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 400,
                    color: active ? '#1d4ed8' : done ? '#16a34a' : '#9ca3af' }}>{label}</span>
                </div>
                {i === 0 && <div style={{ flex: 1, height: 2, maxWidth: 32, borderRadius: 2,
                  background: step === 'reset' ? '#16a34a' : '#e5e7eb' }} />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="login-logo">
          <h1>Fin<span>Secure</span></h1>
          <p>{step === 'email' ? 'Forgot Password' : 'Reset Password'}</p>
        </div>

        {error   && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}

        {step === 'email' ? (
          <>
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
              Enter your registered email address and we'll send you a 6-digit OTP to reset your password.
            </p>
            <form onSubmit={handleSendOtp}>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com" required />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', margin: '8px 0 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
              <p style={{ color: '#374151', fontSize: 14, margin: 0 }}>
                OTP sent to <strong style={{ color: '#1d4ed8' }}>{email}</strong>
              </p>
            </div>
            <form onSubmit={handleReset}>
              <div className="form-group">
                <label>One-Time Password (OTP)</label>
                <input type="text" inputMode="numeric" placeholder="Enter 6-digit OTP"
                  value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                  maxLength={6} autoFocus
                  style={{ letterSpacing:'0.3em', fontSize:20, textAlign:'center', fontWeight:700 }} />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Min 8 characters" required />
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat new password" required />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#6b7280' }}>
              Didn't receive OTP?{' '}
              {countdown > 0
                ? <span style={{ color: '#9ca3af' }}>Resend in {countdown}s</span>
                : <button onClick={handleResend}
                    style={{ background: 'none', border: 'none', color: '#1d4ed8',
                             cursor: 'pointer', fontWeight: 600, fontSize: 14, textDecoration: 'underline' }}>
                    Resend OTP
                  </button>
              }
            </div>
          </>
        )}

        <div className="login-footer" style={{ marginTop: 20 }}>
          <Link to="/login">← Back to Login</Link>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
