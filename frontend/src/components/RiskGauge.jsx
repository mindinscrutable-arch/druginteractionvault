import React from 'react';

export default function RiskGauge({ score }) {
  if (score === null || score === undefined) return null;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Low Risk' : score >= 50 ? 'Moderate Risk' : 'HIGH RISK';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem',
      background: `${color}15`, border: `1px solid ${color}30`, borderRadius: '14px', marginBottom: '1.5rem' }}>
      <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
        <svg width="64" height="64" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8"/>
          <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${(score / 100) * 163.4} 163.4`}
            strokeLinecap="round" transform="rotate(-90 32 32)"
            style={{ transition: 'stroke-dasharray 1s ease-out', filter: `drop-shadow(0 0 6px ${color})` }}/>
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.85rem', fontWeight: 700, color }}>
          {score}
        </div>
      </div>
      <div>
        <div style={{ fontWeight: 700, color, fontSize: '1rem' }}>{label}</div>
        <div style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.2rem' }}>
          Prescription Safety Score (0 = Dangerous, 100 = Safe)
        </div>
      </div>
    </div>
  );
}
