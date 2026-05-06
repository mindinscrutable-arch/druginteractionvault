import React, { useState, useEffect, useCallback } from 'react';
import { Search, ShieldAlert, ShieldCheck, X, Activity, AlertTriangle, Mail } from 'lucide-react';
import HeatmapMatrix from '../components/HeatmapMatrix';
import RiskGauge from '../components/RiskGauge';

const SEARCH_MIN_CHARS = 3;

export default function DrugCheckerTab({ preloadedDrugs, onPreloadConsumed, onCartChange }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [isOverridden, setIsOverridden] = useState(false);
  const [riskScore, setRiskScore] = useState(null);
  const [warningsList, setWarningsList] = useState([]);  // clinical warnings from backend
  const [emailing, setEmailing] = useState(false);

  const handleEmailReport = async () => {
    setEmailing(true);
    try {
      const order = { 'Mild': 1, 'Moderate': 2, 'Severe': 3, 'Contraindicated': 4 };
      let highestSev = null;
      if (interactions.length > 0) {
        highestSev = interactions.reduce((max, i) => order[i.severity] > order[max] ? i.severity : max, interactions[0].severity);
      }

      const payload = {
        block_action: isBlocked,
        highest_severity: highestSev,
        interactions: interactions,
        risk_score: riskScore,
        warnings: warningsList
      };

      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/v1/interactions/email-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to email report');
      alert('Report successfully emailed to your registered address!');
    } catch (err) {
      alert(err.message);
    } finally {
      setEmailing(false);
    }
  };

  // Auto-load patient medications when routed from Patients tab
  useEffect(() => {
    if (preloadedDrugs && preloadedDrugs.length > 0) {
      setCart(preloadedDrugs);
      if (onPreloadConsumed) onPreloadConsumed();
    }
  }, [preloadedDrugs]);

  // Notify parent of cart changes (for chatbot context)
  useEffect(() => {
    if (onCartChange) onCartChange(cart.map(d => d.drug_id));
  }, [cart]);

  useEffect(() => {
    if (searchTerm.length < SEARCH_MIN_CHARS) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/v1/drugs/search?query=${encodeURIComponent(searchTerm)}`);
        if (res.ok) setSearchResults(await res.json());
      } catch(e) { console.error('Drug search failed:', e); } finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const checkInteractions = useCallback(async (overrideMsg = null) => {
    if (cart.length < 2) { setInteractions([]); setIsBlocked(false); setIsOverridden(false); setRiskScore(null); setWarningsList([]); return; }
    try {
      const payload = { drug_ids: cart.map(d => d.drug_id) };
      if (overrideMsg) payload.override_reason = overrideMsg;
      const res = await fetch('/api/v1/interactions/check', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) {
        const data = await res.json();
        setInteractions(data.interactions);
        setIsBlocked(data.block_action);
        setRiskScore(data.risk_score);
        setWarningsList(data.warnings || []);
        if (overrideMsg) { setIsOverridden(true); setShowOverrideModal(false); setOverrideReason(''); }
        else if (data.block_action) setIsOverridden(false);
      }
    } catch(e) { console.error('Interaction check failed:', e); }
  }, [cart]);

  useEffect(() => { checkInteractions(); }, [cart]);

  const addToCart = (drug) => {
    if (!cart.find(d => d.drug_id === drug.drug_id)) setCart([...cart, drug]);
    setSearchTerm(''); setSearchResults([]);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '1.5rem', height: '100%' }}>
      {showOverrideModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#0f172a', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '20px', padding: '2rem', width: '450px', boxShadow: '0 0 60px rgba(239,68,68,0.2)' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#ef4444', marginBottom: '1rem', fontWeight: 700 }}>
              <AlertTriangle /> Override Safety Shield
            </h2>
            <p style={{ color: '#94a3b8', marginBottom: '1.25rem', lineHeight: 1.7 }}>
              You are overriding a <strong style={{ color: '#ef4444' }}>Contraindicated</strong> alert. This action is <strong>permanently recorded</strong> in the clinical audit trail. Provide your medical justification:
            </p>
            <textarea value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
              placeholder="E.g., Benefits outweigh risks given patient's specific history and lack of alternatives..."
              style={{ width: '100%', height: '120px', padding: '0.75rem 1rem', background: 'rgba(15,23,42,0.8)', color: '#f8fafc', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '10px', fontFamily: 'inherit', fontSize: '0.9rem', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowOverrideModal(false)} style={{ padding: '0.6rem 1.4rem', background: 'transparent', border: '1px solid rgba(148,163,184,0.3)', color: '#94a3b8', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={() => overrideReason.trim().length > 5 ? checkInteractions(overrideReason) : alert('Please provide a substantial reason.')}
                style={{ padding: '0.6rem 1.4rem', background: '#ef4444', border: 'none', color: '#fff', borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                ⚠ Confirm Override
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT */}
      <div className="glass-panel" style={{ overflowY: 'auto' }}>
        <h1 style={{fontSize: '1.5rem'}}><Activity size={26} color="#38bdf8" /> Drug Vault</h1>
        <p className="subtitle">Clinical Decision Support System</p>
        <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
          <Search size={18} color="#64748b" style={{ position: 'absolute', top: '21px', left: '18px' }} />
          <input type="text" className="search-input" style={{ paddingLeft: '48px' }}
            placeholder="Search brand or generic name…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          {searching && <span style={{ position: 'absolute', top: '20px', right: '16px', fontSize: '0.75rem', color: '#64748b' }}>●●●</span>}
        </div>
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map(drug => (
              <div key={drug.drug_id} className="drug-pill-add" onClick={() => addToCart(drug)}>
                <div>
                  <div className="pill-text">{drug.brand_name}</div>
                  <div className="pill-sub">{drug.generic_name}{drug.drug_class_name ? ` · ${drug.drug_class_name}` : ''}</div>
                </div>
                <div style={{ color: '#38bdf8', fontWeight: 600, fontSize: '0.9rem' }}>+ Add</div>
              </div>
            ))}
          </div>
        )}
        <div className="cart-list">
          <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '1.5rem', marginBottom: '0.75rem' }}>
            Prescription Cart ({cart.length})
          </h2>
          {cart.map(drug => (
            <div key={drug.drug_id} className="cart-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <div>
                  <strong style={{ fontSize: '1rem' }}>{drug.brand_name}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{drug.generic_name}{drug.drug_class_name ? ` · ${drug.drug_class_name}` : ''}</div>
                </div>
                <button onClick={() => setCart(cart.filter(d => d.drug_id !== drug.drug_id))}><X size={16} /></button>
              </div>
              {drug.description && <div style={{ fontSize: '0.76rem', color: '#475569', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.6rem', borderRadius: '6px', width: '100%' }}>{drug.description}</div>}
            </div>
          ))}
          {cart.length === 0 && <p style={{ textAlign: 'center', color: '#334155', marginTop: '3rem', fontSize: '0.9rem' }}>Add 2+ drugs to analyze combinations.</p>}
        </div>
      </div>

      {/* RIGHT */}
      <div className={`glass-panel ${(isBlocked && !isOverridden) ? 'shield-active' : ''}`} style={{ overflowY: 'auto' }}>
        {cart.length < 2 ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#1e293b' }}>
            <ShieldCheck size={80} style={{ opacity: 0.1, marginBottom: '1.5rem' }} />
            <h3 style={{ color: '#334155', fontWeight: 600 }}>Awaiting Combinations</h3>
            <p style={{ color: '#475569', marginTop: '0.5rem' }}>Add 2 or more drugs to analyze interactions.</p>
          </div>
        ) : (
          <>
            {(isBlocked && !isOverridden) ? (
              <div className="banner alert">
                <ShieldAlert size={28} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700 }}>SAFETY SHIELD ENGAGED</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Contraindicated combination — do not prescribe.</div>
                </div>
                <button onClick={() => setShowOverrideModal(true)}
                  style={{ background: 'rgba(255,255,255,0.15)', padding: '0.5rem 1.1rem', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  OVERRIDE
                </button>
              </div>
            ) : interactions.length > 0 ? (
              <div className="banner caution"><ShieldAlert size={26} />
                <div>
                  <div style={{ fontWeight: 700 }}>{isOverridden ? 'OVERRIDDEN WITH CAUTION' : 'Caution Required'}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Review interactions carefully before proceeding.</div>
                </div>
              </div>
            ) : (
              <div className="banner safe"><ShieldCheck size={26} />
                <div>
                  <div style={{ fontWeight: 700 }}>All Clear</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>No known interactions detected in the database.</div>
                </div>
              </div>
            )}

            <RiskGauge score={riskScore} />

            {/* Clinical Warnings Panel — silent overdose, cascade escalations */}
            {warningsList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {warningsList.map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.75rem 1rem',
                    background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
                    borderRadius: '10px', fontSize: '0.83rem', color: '#fcd34d', lineHeight: 1.5 }}>
                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '0.15rem', color: '#f59e0b' }} />
                    {w}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Interaction Details</h2>
              <button 
                onClick={handleEmailReport} 
                disabled={emailing}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.4rem 0.9rem', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', color: '#38bdf8', cursor: emailing ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600 }}
              >
                <Mail size={14} /> {emailing ? 'Sending...' : 'Email PDF Report'}
              </button>
            </div>
            <div className="matrix-grid">
              {interactions.map((interaction, idx) => {
                const d1 = cart.find(d => d.drug_id === interaction.drug1_id);
                const d2 = cart.find(d => d.drug_id === interaction.drug2_id);
                return (
                  <div key={idx} className="interaction-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{d1?.brand_name} <span style={{ color: '#334155' }}>×</span> {d2?.brand_name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.1rem' }}>
                          {interaction.is_class_interaction && interaction.class1_name
                            ? `Class: ${interaction.class1_name} + ${interaction.class2_name}`
                            : 'Specific Drug Match'}
                        </div>
                      </div>
                      <span className={`severity-tag tag-${interaction.severity}`}>{interaction.severity}</span>
                    </div>
                    <p style={{ fontSize: '0.87rem', color: '#cbd5e1', lineHeight: 1.6, marginTop: '0.75rem' }}>{interaction.description}</p>
                  </div>
                );
              })}
            </div>
            {/* Heatmap Matrix — rendered dynamically from interactions data */}
            <HeatmapMatrix cart={cart} interactions={interactions} />

            {interactions.length === 0 && cart.length >= 2 && (
              <p style={{ textAlign: 'center', color: '#334155', marginTop: '4rem' }}>✓ No known interactions found for this combination.</p>
            )}
          </>
        )}
      </div>

      {/* Print-only report */}
      <style>{`@media print { body * { visibility: hidden; } #print-report, #print-report * { visibility: visible; } #print-report { position: fixed; top: 0; left: 0; width: 100%; background: #fff; color: #000; padding: 2rem; font-family: Arial, sans-serif; } }`}</style>
      <div id="print-report" style={{ display: 'none' }}>
        <h1 style={{ color: '#0f172a' }}>DrugInteraction Vault — Clinical Report</h1>
        <p><strong>Date:</strong> {new Date().toLocaleString()}</p>
        <h2>Prescription ({cart.length} drugs)</h2>
        <ul>{cart.map(d => <li key={d.drug_id}>{d.brand_name} ({d.generic_name})</li>)}</ul>
        <h2>Risk Score: {riskScore ?? 'N/A'} / 100</h2>
        <h2>Interactions Found: {interactions.length}</h2>
        {interactions.map((i, idx) => {
          const d1 = cart.find(d => d.drug_id === i.drug1_id);
          const d2 = cart.find(d => d.drug_id === i.drug2_id);
          return <div key={idx} style={{ marginBottom: '1rem', borderLeft: '4px solid #ef4444', paddingLeft: '1rem' }}><strong>{d1?.brand_name} + {d2?.brand_name}</strong> [{i.severity}]<br />{i.description}</div>;
        })}
        <p style={{ marginTop: '2rem', fontSize: '0.8rem', color: '#64748b' }}>⚠ This report is for educational/demonstration purposes only. Always consult a licensed pharmacist.</p>
      </div>
    </div>
  );
}
