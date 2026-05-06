import React from 'react';

export default function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div style={{ background: 'rgba(15,23,42,0.7)', border: `1px solid ${color}25`, borderTop: `3px solid ${color}`, borderRadius: '16px', padding: '1.5rem' }}>
      <div style={{ color, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
        <Icon size={14} /> {label}
      </div>
      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1 }}>{value?.toLocaleString() ?? '—'}</div>
    </div>
  );
}
