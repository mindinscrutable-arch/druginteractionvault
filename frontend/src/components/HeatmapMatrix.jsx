import React from 'react';

const SEV_CELL_BG = {
  Contraindicated: 'rgba(239,68,68,0.75)',
  Severe: 'rgba(248,113,113,0.55)',
  Moderate: 'rgba(245,158,11,0.5)',
  Mild: 'rgba(253,224,71,0.45)',
};

export default function HeatmapMatrix({ cart, interactions }) {
  if (!cart || cart.length < 2 || !interactions || interactions.length === 0) return null;
  const lookup = {};
  interactions.forEach(i => {
    const key = `${Math.min(i.drug1_id, i.drug2_id)}-${Math.max(i.drug1_id, i.drug2_id)}`;
    lookup[key] = i.severity;
  });
  const cell = (d1, d2) => {
    if (d1.drug_id === d2.drug_id) return (
      <div key={'self'} style={{ width: 44, height: 44, borderRadius: '6px', background: 'rgba(56,189,248,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#38bdf8' }}>✓</div>
    );
    const key = `${Math.min(d1.drug_id, d2.drug_id)}-${Math.max(d1.drug_id, d2.drug_id)}`;
    const sev = lookup[key];
    const bg = sev ? (SEV_CELL_BG[sev] || 'rgba(148,163,184,0.15)') : 'rgba(16,185,129,0.25)';
    return (
      <div key={d2.drug_id} title={sev ? `${d1.brand_name} × ${d2.brand_name}: ${sev}` : `${d1.brand_name} × ${d2.brand_name}: Safe`}
        style={{ width: 44, height: 44, borderRadius: '6px', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#fff', cursor: 'default', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {sev ? sev.slice(0, 4) : '✓'}
      </div>
    );
  };
  return (
    <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '14px' }}>
      <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: '1rem' }}>Interaction Heatmap Matrix</div>
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingTop: 46 }}>
          {cart.map(d => <div key={d.drug_id} style={{ height: 44, display: 'flex', alignItems: 'center', fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis', paddingRight: '0.5rem' }}>{d.brand_name}</div>)}
        </div>
        <div>
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
            {cart.map(d => <div key={d.drug_id} style={{ width: 44, fontSize: '0.62rem', color: '#94a3b8', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.brand_name.slice(0, 6)}</div>)}
          </div>
          {cart.map(d1 => (
            <div key={d1.drug_id} style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
              {cart.map(d2 => cell(d1, d2))}
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        {Object.entries(SEV_CELL_BG).map(([sev, bg]) => (
          <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#64748b' }}>
            <div style={{ width: 10, height: 10, borderRadius: '2px', background: bg }} />{sev}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#64748b' }}>
          <div style={{ width: 10, height: 10, borderRadius: '2px', background: 'rgba(16,185,129,0.25)' }} />Safe
        </div>
      </div>
    </div>
  );
}
