import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api';
import './Login.css';

// ── OTP verification (reused when login detects unverified email) ─────────────
function OtpVerification({ email, onVerified }) {
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; });
    }, 1000);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) { setError('Please enter the 6-digit OTP.'); return; }
    setError(''); setLoading(true);
    try {
      await authAPI.verifyOtp({ email, otpCode: otp, purpose: 'EMAIL_VERIFICATION' });
      setSuccess('Email verified! Please log in now.');
      setTimeout(onVerified, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed.');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResending(true); setError(''); setSuccess('');
    try {
      await authAPI.sendOtp({ email, purpose: 'EMAIL_VERIFICATION' });
      setSuccess('New OTP sent to ' + email);
      startCountdown();
    } catch { setError('Failed to resend OTP.'); }
    finally { setResending(false); }
  };

  return (
    <>
      <div className="login-logo">
        <h1>Fin<span>Secure</span></h1>
        <p>Verify Your Email to Continue</p>
      </div>
      <div style={{ textAlign:'center', margin:'16px 0 24px' }}>
        <div style={{ fontSize:48, marginBottom:10 }}>📧</div>
        <p style={{ color:'#374151', fontSize:14, lineHeight:1.6, margin:0 }}>
          Your email <strong style={{ color:'#1d4ed8' }}>{email}</strong> is not yet verified.<br/>
          A new OTP has been sent — enter it below.
        </p>
      </div>
      {error   && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}
      <form onSubmit={handleVerify}>
        <div className="form-group">
          <label>One-Time Password (OTP)</label>
          <input type="text" inputMode="numeric" placeholder="Enter 6-digit OTP"
            value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
            maxLength={6} autoFocus
            style={{ letterSpacing:'0.3em', fontSize:20, textAlign:'center', fontWeight:700 }} />
        </div>
        <button type="submit" className="btn-primary" disabled={loading || otp.length !== 6}>
          {loading ? 'Verifying...' : 'Verify & Continue'}
        </button>
      </form>
      <div style={{ textAlign:'center', marginTop:16, fontSize:14, color:'#6b7280' }}>
        {countdown > 0
          ? <span style={{ color:'#9ca3af' }}>Resend in {countdown}s</span>
          : <button onClick={handleResend} disabled={resending}
              style={{ background:'none', border:'none', color:'#1d4ed8', cursor:'pointer',
                       fontWeight:600, fontSize:14, textDecoration:'underline' }}>
              {resending ? 'Sending...' : 'Resend OTP'}
            </button>
        }
      </div>
      <div style={{ textAlign:'center', marginTop:12, fontSize:13, color:'#9ca3af' }}>
        <button onClick={onVerified}
          style={{ background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:13 }}>
          ← Back to Login
        </button>
      </div>
    </>
  );
}

// ── Main Login ────────────────────────────────────────────────────────────────
function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(null); // triggers OTP step

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.login(form);
      const { data } = res.data;
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        email: data.email, username: data.username, role: data.role
      }));
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.message || '';
      const code = err.response?.data?.error || '';

      // Backend sends "EMAIL_NOT_VERIFIED:email@x.com" as message
      if (code === 'EMAIL_NOT_VERIFIED' || msg.startsWith('EMAIL_NOT_VERIFIED:')) {
        const email = msg.includes(':') ? msg.split(':')[1] : form.identifier;
        setUnverifiedEmail(email);
      } else {
        setError(msg || 'Invalid credentials. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Show OTP verification if email not verified
  if (unverifiedEmail) {
    return (
      <div className="login-container">
        <div className="login-card" style={{ maxWidth: 420 }}>
          <OtpVerification
            email={unverifiedEmail}
            onVerified={() => setUnverifiedEmail(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo">
          <h1>Fin<span>Secure</span></h1>
          <p>Customer Banking Portal</p>
        </div>
        <h2 className="login-title">Sign In to Your Account</h2>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email or Username</label>
            <input type="text" name="identifier" placeholder="Enter email or username"
              value={form.identifier} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" placeholder="Enter password"
              value={form.password} onChange={handleChange} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          Don't have an account? <Link to="/register">Register here</Link>
          <br />
          <Link to="/forgot-password" style={{ color: '#6b7280', fontSize: 13 }}>Forgot password?</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
