import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Calendar, Activity, LogOut, Key } from 'lucide-react';

export default function AccountTab() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMe = async () => {
      const token = localStorage.getItem('token');
      try {
        const res = await fetch('/api/v1/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          setUser(await res.json());
        }
      } catch (e) {
        console.error('Failed to fetch user profile:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchMe();
  }, []);

  if (loading) return <div style={{ padding: '2rem', color: '#64748b' }}>Loading profile...</div>;
  if (!user) return <div style={{ padding: '2rem', color: '#ef4444' }}>Failed to load profile. Please log in again.</div>;

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  const infoRow = (Icon, label, value) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'rgba(15,23,42,0.4)', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.08)' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(56,189,248,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
        <Icon size={20} />
      </div>
      <div>
        <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.1rem' }}>{label}</div>
        <div style={{ fontSize: '1rem', color: '#f8fafc', fontWeight: 600 }}>{value || 'N/A'}</div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#020617', margin: '0 auto 1.5rem auto', boxShadow: '0 0 30px rgba(56,189,248,0.3)' }}>
          <User size={50} strokeWidth={1.5} />
        </div>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>{user.full_name || 'Clinical User'}</h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: '#38bdf8' }}>
          <Shield size={16} />
          <span style={{ fontWeight: 600, textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.1em' }}>{user.role} Account</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {infoRow(Mail, 'Email Address', user.email)}
        {infoRow(Key, 'User ID', `#${user.id}`)}
        {infoRow(Calendar, 'Age / Date of Birth', user.age ? `${user.age} years` : 'Not provided')}
        {infoRow(Activity, 'Verification Status', user.is_verified ? 'Identity Verified' : 'Pending Verification')}
      </div>

      <div style={{ marginTop: '3rem', padding: '2rem', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '16px', textAlign: 'center' }}>
        <h3 style={{ color: '#f87171', fontWeight: 600, marginBottom: '1rem' }}>Security Actions</h3>
        <button onClick={handleLogout} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 2rem', background: '#ef4444', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          <LogOut size={18} /> Logout and End Session
        </button>
      </div>
    </div>
  );
}
