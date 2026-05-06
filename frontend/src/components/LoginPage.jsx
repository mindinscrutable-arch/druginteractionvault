import React, { useState } from 'react';
import { ShieldCheck, LogIn, Mail, Lock, UserPlus, KeyRound, ArrowRight, RefreshCw } from 'lucide-react';

export default function LoginPage({ onLogin, onNavigateRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [useOtp, setUseOtp] = useState(false);
  const [step, setStep] = useState('input'); // 'input' or 'verify'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Use relative URL to leverage Vite Proxy
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

  const handlePasswordLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      onLogin(data.access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async (e) => {
    if (e) e.preventDefault();
    if (!email) {
      setError('Please enter your email first');
      return;
    }
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login-otp-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to send OTP');
      setStep('verify');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/login-otp-verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: otpCode })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid verification code');
      onLogin(data.access_token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at top right, #0f172a, #020617)' }}>
      <div style={{ width: '420px', background: 'rgba(30,41,59,0.5)', backdropFilter: 'blur(20px)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '28px', padding: '3rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div style={{ background: 'rgba(56,189,248,0.1)', padding: '1.2rem', borderRadius: '50%', marginBottom: '1.2rem', boxShadow: '0 0 20px rgba(56,189,248,0.2)' }}>
            <ShieldCheck size={52} color="#38bdf8" />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.025em' }}>Access Vault</h1>
          <p style={{ color: '#94a3b8', marginTop: '0.6rem', fontSize: '1rem' }}>
            {step === 'verify' ? 'Check your email for code' : 'Secure Clinical Login'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)', animation: 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {step === 'input' ? (
            <>
              <div style={{ position: 'relative' }}>
                <Mail size={20} color="#64748b" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="email" 
                  placeholder="Medical Email" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '14px', color: '#f8fafc', outline: 'none', fontSize: '1rem', boxSizing: 'border-box', transition: 'all 0.3s ease' }}
                />
              </div>

              {!useOtp ? (
                <div style={{ position: 'relative' }}>
                  <Lock size={20} color="#64748b" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="password" 
                    placeholder="Vault Password" 
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '14px', color: '#f8fafc', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' }}
                  />
                </div>
              ) : null}

              <button 
                onClick={useOtp ? requestOtp : handlePasswordLogin}
                disabled={loading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.7rem', padding: '1rem', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '14px', fontWeight: 700, fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.5rem', boxShadow: '0 10px 15px -3px rgba(56,189,248,0.3)', transition: 'all 0.3s ease' }}
              >
                {loading ? <RefreshCw size={22} className="animate-spin" /> : <LogIn size={22} />}
                {loading ? (useOtp ? 'Sending...' : 'Verifying...') : (useOtp ? 'Send Login Code' : 'Sign In')}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button 
                  onClick={() => setUseOtp(!useOtp)}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: '0 auto' }}
                >
                  <KeyRound size={16} />
                  {useOtp ? 'Use Password instead' : 'Login with Email OTP'}
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.95rem' }}>
                We sent a code to <span style={{ color: '#f8fafc', fontWeight: 600 }}>{email}</span>
              </div>
              
              <div style={{ position: 'relative' }}>
                <KeyRound size={20} color="#64748b" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="6-Char Code" 
                  autoFocus
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.toUpperCase())}
                  style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '14px', color: '#f8fafc', outline: 'none', fontSize: '1.2rem', letterSpacing: '0.4rem', textAlign: 'center', boxSizing: 'border-box' }}
                />
              </div>

              <button 
                onClick={verifyOtp}
                disabled={loading}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.7rem', padding: '1rem', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '14px', fontWeight: 700, fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? <RefreshCw size={22} className="animate-spin" /> : <ArrowRight size={22} />}
                {loading ? 'Verifying...' : 'Complete Login'}
              </button>

              <button 
                onClick={() => setStep('input')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Back to email
              </button>
            </div>
          )}
        </div>

        <div style={{ marginTop: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.95rem', borderTop: '1px solid rgba(148,163,184,0.1)', paddingTop: '1.5rem' }}>
          Don't have a practitioner account?{' '}
          <button 
            onClick={onNavigateRegister}
            style={{ background: 'none', border: 'none', color: '#38bdf8', fontWeight: 700, cursor: 'pointer', padding: 0 }}
          >
            Create account
          </button>
        </div>

      </div>
      <style>{`
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
