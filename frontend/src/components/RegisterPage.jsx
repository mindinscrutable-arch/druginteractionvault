import React, { useState } from 'react';
import { ShieldCheck, UserPlus, Mail, Lock, CheckCircle, ArrowRight, User, Calendar, X, RefreshCw, Smartphone } from 'lucide-react';

export default function RegisterPage({ onRegistered, onNavigateLogin }) {
  const [step, setStep] = useState(1); // 1: Info, 2: Verification
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  // Use relative URL to leverage Vite Proxy (fixes 'Failed to fetch' / CORS issues)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      console.log('Registering...', email);
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password,
          full_name: fullName,
          age: parseInt(age) || null
        })
      });
      const data = await res.json();
      console.log('Register response:', res.status, data);
      
      if (!res.ok) {
        throw new Error(data.detail || 'Registration failed');
      }
      
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode })
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Verification failed');
      }

      // 2-Step Success! Now Auto-Login
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const loginRes = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
      });

      const loginData = await loginRes.json();
      if (loginRes.ok) {
        onRegistered(loginData.access_token); 
      } else {
        onNavigateLogin(); 
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/v1/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: '' })
      });
      setResendTimer(60);
      const timer = setInterval(() => {
        setResendTimer(prev => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at top right, #0f172a, #020617)' }}>
      <div style={{ width: '420px', background: 'rgba(30,41,59,0.5)', backdropFilter: 'blur(20px)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '28px', padding: '3rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6)', position: 'relative' }}>
        
        {/* Progress Bar */}
        <div style={{ display: 'flex', gap: '8px', position: 'absolute', top: '1.5rem', left: '3rem', right: '3rem' }}>
          <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: '#10b981', transition: 'all 0.5s' }} />
          <div style={{ flex: 1, height: '4px', borderRadius: '2px', background: step === 2 ? '#10b981' : 'rgba(148,163,184,0.2)', transition: 'all 0.5s' }} />
        </div>

        <button 
          onClick={onNavigateLogin}
          style={{ position: 'absolute', top: '2.5rem', right: '2rem', background: 'rgba(148,163,184,0.1)', border: 'none', borderRadius: '50%', padding: '0.6rem', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={18} />
        </button>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2.5rem', marginTop: '1rem' }}>
          <div style={{ background: 'rgba(16,185,129,0.1)', padding: '1.2rem', borderRadius: '50%', marginBottom: '1.2rem', boxShadow: '0 0 20px rgba(16,185,129,0.2)' }}>
            {step === 1 ? <UserPlus size={48} color="#10b981" /> : <Smartphone size={48} color="#10b981" />}
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc', margin: 0, letterSpacing: '-0.025em' }}>
            {step === 1 ? 'Join Vault' : 'Verify Identity'}
          </h1>
          <p style={{ color: '#94a3b8', marginTop: '0.6rem', textAlign: 'center', fontSize: '1rem' }}>
            {step === 1 ? 'Step 1: Clinical Profile' : 'Step 2: Enter 6-digit code'}
          </p>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', textAlign: 'center', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ position: 'relative' }}>
              <User size={20} color="#64748b" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" placeholder="Full Name" required value={fullName} onChange={e => setFullName(e.target.value)}
                style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '14px', color: '#f8fafc', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Calendar size={20} color="#64748b" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="number" placeholder="Age" required value={age} onChange={e => setAge(e.target.value)}
                style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '14px', color: '#f8fafc', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Mail size={20} color="#64748b" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="email" placeholder="Professional Email" required value={email} onChange={e => setEmail(e.target.value)}
                style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '14px', color: '#f8fafc', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ position: 'relative' }}>
              <Lock size={20} color="#64748b" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="password" placeholder="Secure Password" required value={password} onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '14px', color: '#f8fafc', outline: 'none', fontSize: '1rem', boxSizing: 'border-box' }}
              />
            </div>

            <button 
              type="submit" disabled={loading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.7rem', padding: '1rem', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '14px', fontWeight: 700, fontSize: '1.1rem', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.5rem', boxShadow: '0 10px 15px -3px rgba(16,185,129,0.3)' }}
            >
              {loading ? <RefreshCw size={22} className="animate-spin" /> : <UserPlus size={22} />}
              {loading ? 'Creating...' : 'Continue to Verify'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ position: 'relative' }}>
              <CheckCircle size={20} color="#64748b" style={{ position: 'absolute', left: '1.2rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" placeholder="6-Char Code" required maxLength={6} autoFocus
                value={verificationCode} onChange={e => setVerificationCode(e.target.value.toUpperCase())}
                style={{ width: '100%', padding: '1rem 1rem 1rem 3.5rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '14px', color: '#f8fafc', outline: 'none', fontSize: '1.4rem', letterSpacing: '0.5rem', textAlign: 'center', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ textAlign: 'center' }}>
              <button 
                type="button" disabled={loading || resendTimer > 0} onClick={handleResendOtp}
                style={{ background: 'none', border: 'none', color: resendTimer > 0 ? '#475569' : '#38bdf8', fontSize: '0.9rem', cursor: resendTimer > 0 ? 'not-allowed' : 'pointer', fontWeight: 600 }}
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
              </button>
            </div>

            <button 
              type="submit" disabled={loading || verificationCode.length < 6}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.7rem', padding: '1rem', background: '#38bdf8', color: '#0f172a', border: 'none', borderRadius: '14px', fontWeight: 700, fontSize: '1.1rem', cursor: (loading || verificationCode.length < 6) ? 'not-allowed' : 'pointer' }}
            >
              Verify & Launch Vault <ArrowRight size={22} />
            </button>
            
            <button 
              type="button" onClick={() => setStep(1)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.9rem', cursor: 'pointer', marginTop: '0.5rem' }}
            >
              Change email or password
            </button>
          </form>
        )}

        <div style={{ marginTop: '2.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.95rem', borderTop: '1px solid rgba(148,163,184,0.1)', paddingTop: '1.5rem' }}>
          Joined already?{' '}
          <button 
            onClick={onNavigateLogin}
            style={{ background: 'none', border: 'none', color: '#10b981', fontWeight: 700, cursor: 'pointer', padding: 0 }}
          >
            Sign in
          </button>
        </div>

      </div>
      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
