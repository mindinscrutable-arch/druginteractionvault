import React, { useState } from 'react';
import { ShieldCheck, Mail, Lock, User, Calendar, KeyRound, ArrowRight } from 'lucide-react';

export default function Auth({ onLoginSuccess }) {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'otp-request', 'otp-verify', 'verify-email'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    age: '',
    code: ''
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleStandardLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const formData = new URLSearchParams();
      formData.append('username', form.email);
      formData.append('password', form.password);

      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.detail === 'Email not verified') setMode('verify-email');
        throw new Error(data.detail || 'Login failed');
      }
      localStorage.setItem('token', data.access_token);
      onLoginSuccess();
    } catch (err) { 
      const msg = typeof err.message === 'object' ? JSON.stringify(err.message) : err.message;
      setError(msg); 
    }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          full_name: form.full_name,
          age: parseInt(form.age) || null
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed');
      setMode('verify-email');
      setError('Registration successful! Please check your email for the verification code.');
    } catch (err) { 
      const msg = typeof err.message === 'object' ? JSON.stringify(err.message) : err.message;
      setError(msg); 
    }
    finally { setLoading(false); }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code: form.code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Verification failed');
      setMode('login');
      setError('Email verified successfully! You can now log in.');
    } catch (err) { 
      const msg = typeof err.message === 'object' ? JSON.stringify(err.message) : err.message;
      setError(msg); 
    }
    finally { setLoading(false); }
  };

  const handleOtpRequest = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/auth/login-otp-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to request OTP');
      setMode('otp-verify');
      setError('A secure login code has been sent to your email.');
    } catch (err) { 
      const msg = typeof err.message === 'object' ? JSON.stringify(err.message) : err.message;
      setError(msg); 
    }
    finally { setLoading(false); }
  };

  const handleOtpVerify = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/v1/auth/login-otp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, code: form.code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid OTP');
      localStorage.setItem('token', data.access_token);
      onLoginSuccess();
    } catch (err) { 
      const msg = typeof err.message === 'object' ? JSON.stringify(err.message) : err.message;
      setError(msg); 
    }
    finally { setLoading(false); }
  };

  const inputStyle = {
    width: '100%', padding: '0.8rem 1rem 0.8rem 2.8rem', background: 'rgba(15,23,42,0.6)',
    border: '1px solid rgba(148,163,184,0.2)', borderRadius: '12px', color: '#f8fafc',
    fontSize: '0.95rem', transition: 'all 0.2s', outline: 'none'
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', alignItems: 'center', justifyContent: 'center', background: 'url(/bg-auth.jpg) center/cover no-repeat, #020617' }}>
      <div style={{ width: '420px', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(24px)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '24px', padding: '2.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <ShieldCheck size={48} color="#38bdf8" style={{ margin: '0 auto 1rem auto' }} />
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>DrugVault Access</h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Secure Clinical Decision Support System</p>
        </div>

        {error && (
          <div style={{ padding: '0.8rem', background: error.includes('success') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${error.includes('success') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '10px', color: error.includes('success') ? '#34d399' : '#f87171', fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center', lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        <form onSubmit={
          mode === 'login' ? handleStandardLogin :
          mode === 'register' ? handleRegister :
          mode === 'verify-email' ? handleVerifyEmail :
          mode === 'otp-request' ? handleOtpRequest : handleOtpVerify
        }>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#64748b" style={{ position: 'absolute', top: '15px', left: '16px' }} />
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Email Address" required style={inputStyle} disabled={mode === 'verify-email' || mode === 'otp-verify'} />
            </div>

            {mode === 'register' && (
              <>
                <div style={{ position: 'relative' }}>
                  <User size={18} color="#64748b" style={{ position: 'absolute', top: '15px', left: '16px' }} />
                  <input type="text" name="full_name" value={form.full_name} onChange={handleChange} placeholder="Full Name" required style={inputStyle} />
                </div>
                <div style={{ position: 'relative' }}>
                  <Calendar size={18} color="#64748b" style={{ position: 'absolute', top: '15px', left: '16px' }} />
                  <input type="number" name="age" value={form.age} onChange={handleChange} placeholder="Age (Optional)" style={inputStyle} />
                </div>
              </>
            )}

            {(mode === 'login' || mode === 'register') && (
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#64748b" style={{ position: 'absolute', top: '15px', left: '16px' }} />
                <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Password" required style={inputStyle} />
              </div>
            )}

            {(mode === 'verify-email' || mode === 'otp-verify') && (
              <div style={{ position: 'relative' }}>
                <KeyRound size={18} color="#64748b" style={{ position: 'absolute', top: '15px', left: '16px' }} />
                <input type="text" name="code" value={form.code} onChange={handleChange} placeholder="6-Digit Verification Code" required maxLength={6} style={{...inputStyle, textTransform: 'uppercase', letterSpacing: '4px', fontWeight: 700}} />
              </div>
            )}

            <button type="submit" disabled={loading} style={{ marginTop: '0.5rem', width: '100%', padding: '0.85rem', background: 'linear-gradient(135deg, #38bdf8, #818cf8)', border: 'none', borderRadius: '12px', color: '#020617', fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transition: 'transform 0.1s' }}>
              {loading ? 'Processing...' : (
                <>
                  {mode === 'login' ? 'Sign In' :
                   mode === 'register' ? 'Create Account' :
                   mode === 'verify-email' ? 'Verify Email' :
                   mode === 'otp-request' ? 'Send Code' : 'Verify & Sign In'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>

          </div>
        </form>

        <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem', color: '#94a3b8' }}>
          {mode === 'login' && (
            <>
              <button onClick={() => { setForm({...form, email: 'shrutiraina828@gmail.com'}); setMode('otp-request'); setError(''); }} 
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '12px', color: '#38bdf8', fontWeight: 600, cursor: 'pointer', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <KeyRound size={16} /> Administrative Access (OTP)
              </button>
              <button onClick={() => { setMode('otp-request'); setError(''); }} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>Login without password (Email OTP)</button>
              <div style={{ marginTop: '0.5rem' }}>Don't have an account? <button onClick={() => { setMode('register'); setError(''); }} style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontWeight: 600, cursor: 'pointer' }}>Register</button></div>
            </>
          )}
          {mode === 'register' && (
            <div>Already have an account? <button onClick={() => { setMode('login'); setError(''); }} style={{ background: 'transparent', border: 'none', color: '#f8fafc', fontWeight: 600, cursor: 'pointer' }}>Sign In</button></div>
          )}
          {mode === 'otp-request' && (
            <button onClick={() => { setMode('login'); setError(''); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>← Back to standard login</button>
          )}
          {(mode === 'verify-email' || mode === 'otp-verify') && (
            <button onClick={() => { setMode(mode === 'verify-email' ? 'register' : 'otp-request'); setError(''); }} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>← Cancel</button>
          )}
        </div>

      </div>
    </div>
  );
}
