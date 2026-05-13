import React, { useState, useEffect } from 'react';
import { BarChart2, Database, Users, Zap, ShieldAlert, Activity, AlertOctagon, AlertTriangle } from 'lucide-react';
import StatCard from '../components/StatCard';

const SEV_COLORS = { Contraindicated: '#ef4444', Severe: '#f87171', Moderate: '#f59e0b', Mild: '#fde047' };

export default function StatsTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/v1/stats', {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(d => { setStats(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (loading) return <div style={{ textAlign: 'center', color: '#64748b', padding: '6rem' }}>Loading statistics...</div>;
  if (!stats) return <div style={{ textAlign: 'center', color: '#ef4444', padding: '6rem' }}>Failed to load stats.</div>;
  const maxClass = Math.max(...(stats.top_drug_classes?.map(c => c.count) ?? [1]));
  const maxSev = Math.max(...Object.values(stats.severity_breakdown ?? {}));
  return (
    <div style={{ padding: '2rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}><BarChart2 color="#38bdf8" size={24} /> Live Statistics</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem', fontSize: '0.9rem' }}>Real-time aggregate SQL queries — COUNT, GROUP BY, ORDER BY — over the clinical vault.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px,1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Total Drugs" value={stats.total_drugs} icon={Database} color="#38bdf8" />
        <StatCard label="Drug Classes" value={stats.total_classes} icon={Users} color="#818cf8" />
        <StatCard label="Specific DDIs" value={stats.total_specific_interactions} icon={Zap} color="#f59e0b" />
        <StatCard label="Class DDIs" value={stats.total_class_interactions} icon={ShieldAlert} color="#f87171" />
        <StatCard label="Checks Run" value={stats.total_checks_performed} icon={Activity} color="#10b981" />
        <StatCard label="Blocked" value={stats.total_blocked} icon={AlertOctagon} color="#ef4444" />
        <StatCard label="Overridden" value={stats.total_overrides} icon={AlertTriangle} color="#f59e0b" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '16px', padding: '1.5rem' }}>
          <h3 style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '1.5rem', fontSize: '1rem' }}>Interaction Severity Breakdown</h3>
          {Object.entries(stats.severity_breakdown ?? {}).map(([sev, count]) => (
            <div key={sev} style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.88rem' }}>
                <span style={{ color: SEV_COLORS[sev] ?? '#94a3b8', fontWeight: 600 }}>{sev}</span>
                <span style={{ color: '#64748b' }}>{count} rules</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(148,163,184,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(count / maxSev) * 100}%`, background: SEV_COLORS[sev] ?? '#94a3b8', borderRadius: '99px', boxShadow: `0 0 10px ${SEV_COLORS[sev]}60`, transition: 'width 1s ease-out' }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '16px', padding: '1.5rem' }}>
          <h3 style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '1.5rem', fontSize: '1rem' }}>Top Drug Classes by Volume</h3>
          {stats.top_drug_classes?.map((cls, i) => (
            <div key={cls.name} style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.88rem' }}>
                <span style={{ color: '#cbd5e1' }}>{cls.name}</span>
                <span style={{ color: '#64748b' }}>{cls.count} drugs</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(148,163,184,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(cls.count / maxClass) * 100}%`, background: `hsl(${200 + i * 20},70%,55%)`, borderRadius: '99px', transition: 'width 1s ease-out' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
