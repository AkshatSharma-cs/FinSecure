import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../api';
import './Login.css';

// ── Step 1: Registration form ────────────────────────────────────────────────
function RegistrationForm({ onSuccess }) {
  const [form, setForm] = useState({
    email: '', username: '', password: '', firstName: '', lastName: '',
    phone: '', dateOfBirth: '', panNumber: '', address: '', city: '', state: '', pinCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authAPI.register(form);
      onSuccess(form.email);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="login-logo">
        <h1>Fin<span>Secure</span></h1>
        <p>Create Your Banking Account</p>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
          {[['firstName','First Name','text'],['lastName','Last Name','text'],
            ['email','Email','email'],['username','Username','text'],
            ['phone','Phone','tel'],['dateOfBirth','Date of Birth','date']].map(([name, label, type]) => (
            <div className="form-group" key={name}>
              <label>{label}</label>
              <input type={type} name={name} value={form[name]} onChange={handleChange} required />
            </div>
          ))}
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" name="password" value={form.password} onChange={handleChange} required
            placeholder="Min 8 chars, uppercase, lowercase, digit, special char" />
        </div>
        <div className="form-group">
          <label>PAN Number (optional)</label>
          <input type="text" name="panNumber" value={form.panNumber} onChange={handleChange} maxLength="10" />
        </div>
        <div className="form-group">
          <label>Address</label>
          <input type="text" name="address" value={form.address} onChange={handleChange} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 20px' }}>
          {[['city','City'],['state','State'],['pinCode','PIN Code']].map(([name, label]) => (
            <div className="form-group" key={name}>
              <label>{label}</label>
              <input type="text" name={name} value={form[name]} onChange={handleChange}
                maxLength={name === 'pinCode' ? 6 : undefined} />
            </div>
          ))}
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="login-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </>
  );
}

// ── Step 2: OTP verification ─────────────────────────────────────────────────
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
      setSuccess('Email verified! Redirecting to login...');
      setTimeout(onVerified, 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true); setError(''); setSuccess('');
    try {
      await authAPI.sendOtp({ email, purpose: 'EMAIL_VERIFICATION' });
      setSuccess('A new OTP has been sent to ' + email);
      startCountdown();
    } catch {
      setError('Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <>
      <div className="login-logo">
        <h1>Fin<span>Secure</span></h1>
        <p>Verify Your Email</p>
      </div>

      {/* Email icon / banner */}
      <div style={{ textAlign: 'center', margin: '16px 0 24px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>📧</div>
        <p style={{ color: '#374151', fontSize: 14, lineHeight: 1.6, margin: 0 }}>
          We've sent a <strong>6-digit OTP</strong> to<br />
          <strong style={{ color: '#1d4ed8' }}>{email}</strong>
        </p>
        <p style={{ color: '#6b7280', fontSize: 13, marginTop: 8 }}>
          Enter it below to verify your account. Valid for <strong>5 minutes</strong>.
        </p>
      </div>

      {error   && <div className="error-msg">{error}</div>}
      {success && <div className="success-msg">{success}</div>}

      <form onSubmit={handleVerify}>
        <div className="form-group">
          <label>One-Time Password (OTP)</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            style={{ letterSpacing: '0.3em', fontSize: 20, textAlign: 'center', fontWeight: 700 }}
            autoFocus
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading || otp.length !== 6}>
          {loading ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#6b7280' }}>
        Didn't receive the OTP?{' '}
        {countdown > 0
          ? <span style={{ color: '#9ca3af' }}>Resend in {countdown}s</span>
          : <button onClick={handleResend} disabled={resending}
              style={{ background: 'none', border: 'none', color: '#1d4ed8', cursor: 'pointer',
                       fontWeight: 600, fontSize: 14, textDecoration: 'underline' }}>
              {resending ? 'Sending...' : 'Resend OTP'}
            </button>
        }
      </div>
      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: '#9ca3af' }}>
        Check your spam folder if you don't see the email.
      </div>
    </>
  );
}

// ── Main Register component: handles step switching ──────────────────────────
function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState('register'); // 'register' | 'otp'
  const [email, setEmail] = useState('');

  const handleRegistered = (registeredEmail) => {
    setEmail(registeredEmail);
    setStep('otp');
  };

  const handleVerified = () => {
    navigate('/login');
  };

  return (
    <div className="login-container">
      <div className="login-card" style={{ maxWidth: step === 'register' ? 560 : 420 }}>

        {/* Progress indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, gap: 8 }}>
          {['Create Account', 'Verify Email'].map((label, i) => {
            const active = (i === 0 && step === 'register') || (i === 1 && step === 'otp');
            const done   = i === 0 && step === 'otp';
            return (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: 13, fontWeight: 700,
                    background: done ? '#16a34a' : active ? '#1d4ed8' : '#e5e7eb',
                    color: done || active ? 'white' : '#9ca3af',
                  }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: active ? 700 : 400,
                                 color: active ? '#1d4ed8' : done ? '#16a34a' : '#9ca3af' }}>
                    {label}
                  </span>
                </div>
                {i === 0 && (
                  <div style={{ flex: 1, height: 2, background: step === 'otp' ? '#16a34a' : '#e5e7eb',
                                maxWidth: 32, borderRadius: 2 }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {step === 'register'
          ? <RegistrationForm onSuccess={handleRegistered} />
          : <OtpVerification email={email} onVerified={handleVerified} />
        }
      </div>
    </div>
  );
}

export default Register;