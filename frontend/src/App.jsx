import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, ShieldAlert, ShieldCheck, X, Activity, AlertTriangle,
  BarChart2, ClipboardList, Database, Users, Zap, AlertOctagon,
  ChevronLeft, ChevronRight, Plus, Trash2, UserPlus, Pill
} from 'lucide-react';
import './index.css';

/* ═══════════════════════════════════════════════════════════════
   RISK SCORE GAUGE
═══════════════════════════════════════════════════════════════ */
function RiskGauge({ score }) {
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

/* ═══════════════════════════════════════════════════════════════
   DRUG CHECKER TAB
═══════════════════════════════════════════════════════════════ */
function DrugCheckerTab({ preloadedDrugs, onPreloadConsumed }) {
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

  // Auto-load patient medications when routed from Patients tab
  useEffect(() => {
    if (preloadedDrugs && preloadedDrugs.length > 0) {
      setCart(preloadedDrugs);
      if (onPreloadConsumed) onPreloadConsumed();
    }
  }, [preloadedDrugs]);


  useEffect(() => {
    if (searchTerm.length < 3) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/v1/drugs/search?query=${searchTerm}`);
        if (res.ok) setSearchResults(await res.json());
      } catch(e) {} finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchTerm]);

  const checkInteractions = useCallback(async (overrideMsg = null) => {
    if (cart.length < 2) { setInteractions([]); setIsBlocked(false); setIsOverridden(false); setRiskScore(null); return; }
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
        if (overrideMsg) { setIsOverridden(true); setShowOverrideModal(false); setOverrideReason(''); }
        else if (data.block_action) setIsOverridden(false);
      }
    } catch(e) {}
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
        <h1><Activity size={26} color="#38bdf8" /> Drug Vault</h1>
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

            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Interaction Details</h2>
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
            {interactions.length === 0 && cart.length >= 2 && (
              <p style={{ textAlign: 'center', color: '#334155', marginTop: '4rem' }}>✓ No known interactions found for this combination.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   STATISTICS TAB
═══════════════════════════════════════════════════════════════ */
function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div style={{ background: 'rgba(15,23,42,0.7)', border: `1px solid ${color}25`, borderTop: `3px solid ${color}`, borderRadius: '16px', padding: '1.5rem' }}>
      <div style={{ color, display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
        <Icon size={14} /> {label}
      </div>
      <div style={{ fontSize: '2.5rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1 }}>{value?.toLocaleString() ?? '—'}</div>
    </div>
  );
}

function StatsTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch('/api/v1/stats').then(r => r.json()).then(d => { setStats(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);
  if (loading) return <div style={{ textAlign: 'center', color: '#64748b', padding: '6rem' }}>Loading statistics...</div>;
  if (!stats) return <div style={{ textAlign: 'center', color: '#ef4444', padding: '6rem' }}>Failed to load stats.</div>;
  const maxClass = Math.max(...(stats.top_drug_classes?.map(c => c.count) ?? [1]));
  const maxSev = Math.max(...Object.values(stats.severity_breakdown ?? {}));
  const sevColors = { Contraindicated: '#ef4444', Severe: '#f87171', Moderate: '#f59e0b', Mild: '#fde047' };
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
                <span style={{ color: sevColors[sev] ?? '#94a3b8', fontWeight: 600 }}>{sev}</span>
                <span style={{ color: '#64748b' }}>{count} rules</span>
              </div>
              <div style={{ height: '8px', background: 'rgba(148,163,184,0.08)', borderRadius: '99px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(count / maxSev) * 100}%`, background: sevColors[sev] ?? '#94a3b8', borderRadius: '99px', boxShadow: `0 0 10px ${sevColors[sev]}60`, transition: 'width 1s ease-out' }} />
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

/* ═══════════════════════════════════════════════════════════════
   DRUG EXPLORER TAB
═══════════════════════════════════════════════════════════════ */
function DrugExplorerTab() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [drugInteractions, setDrugInteractions] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDrugs = useCallback(async (p = 1, s = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/drugs?page=${p}&limit=20&search=${encodeURIComponent(s)}`);
      if (res.ok) setData(await res.json());
    } catch(e) {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDrugs(page, search); }, [page, search]);

  const handleSearch = (val) => { setSearch(val); setPage(1); };

  const selectDrug = async (drug) => {
    setSelected(drug);
    setDrugInteractions(null);
    try {
      const res = await fetch(`/api/v1/drugs/${drug.drug_id}/interactions`);
      if (res.ok) setDrugInteractions(await res.json());
    } catch(e) {}
  };

  const sevColors = { Contraindicated: '#ef4444', Severe: '#f87171', Moderate: '#f59e0b', Mild: '#fde047' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', height: '100%', overflow: 'hidden' }}>
      {/* Drug List */}
      <div style={{ padding: '2rem', overflowY: 'auto', borderRight: '1px solid rgba(148,163,184,0.08)' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}><Database color="#38bdf8" size={22} /> Drug Database Explorer</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.88rem' }}>Browse {data?.total?.toLocaleString() ?? '...'} drugs. Click any drug to see its known interactions.</p>
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', top: '18px', left: '16px' }} />
          <input type="text" className="search-input" style={{ paddingLeft: '44px', height: '52px' }}
            placeholder="Filter by brand or generic name…" value={search} onChange={e => handleSearch(e.target.value)} />
        </div>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '3rem' }}>Loading...</div>
        ) : (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {data?.drugs?.map(drug => (
              <div key={drug.drug_id} onClick={() => selectDrug(drug)}
                style={{ padding: '0.9rem 1.25rem', background: selected?.drug_id === drug.drug_id ? 'rgba(56,189,248,0.1)' : 'rgba(15,23,42,0.5)',
                  border: `1px solid ${selected?.drug_id === drug.drug_id ? 'rgba(56,189,248,0.4)' : 'rgba(148,163,184,0.08)'}`,
                  borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{drug.brand_name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{drug.generic_name}</div>
                </div>
                {drug.drug_class && <span style={{ fontSize: '0.72rem', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '0.2rem 0.6rem', borderRadius: '20px', whiteSpace: 'nowrap' }}>{drug.drug_class}</span>}
              </div>
            ))}
          </div>
        )}
        {/* Pagination */}
        {data && data.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '1.5rem' }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
              style={{ padding: '0.5rem', background: 'transparent', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', color: '#94a3b8', cursor: page===1?'not-allowed':'pointer' }}>
              <ChevronLeft size={16} />
            </button>
            <span style={{ color: '#64748b', fontSize: '0.88rem' }}>Page {page} of {data.pages}</span>
            <button onClick={() => setPage(p => Math.min(data.pages, p+1))} disabled={page === data.pages}
              style={{ padding: '0.5rem', background: 'transparent', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', color: '#94a3b8', cursor: page===data.pages?'not-allowed':'pointer' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Drug Detail Panel */}
      <div style={{ padding: '2rem', overflowY: 'auto', background: 'rgba(2,6,23,0.4)' }}>
        {!selected ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#334155' }}>
            <Pill size={56} style={{ opacity: 0.15, marginBottom: '1rem' }} />
            <p>Select a drug to view its interactions</p>
          </div>
        ) : (
          <>
            <h3 style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: '0.25rem' }}>{selected.brand_name}</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{selected.generic_name}</p>
            {selected.drug_class && <span style={{ fontSize: '0.78rem', color: '#38bdf8', background: 'rgba(56,189,248,0.1)', padding: '0.25rem 0.75rem', borderRadius: '20px', display: 'inline-block', marginBottom: '1rem' }}>{selected.drug_class}</span>}
            {selected.description && <p style={{ fontSize: '0.82rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '10px' }}>{selected.description}</p>}
            <h4 style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
              Known Interactions {drugInteractions ? `(${drugInteractions.interactions.length})` : ''}
            </h4>
            {!drugInteractions ? <div style={{ color: '#64748b', fontSize: '0.88rem' }}>Loading...</div> :
              drugInteractions.interactions.length === 0 ?
                <p style={{ color: '#334155', fontSize: '0.88rem' }}>No specific interactions recorded for this drug.</p> :
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {drugInteractions.interactions.map((i, idx) => (
                    <div key={idx} style={{ background: 'rgba(15,23,42,0.6)', border: `1px solid ${sevColors[i.severity]}25`, borderLeft: `3px solid ${sevColors[i.severity]}`, borderRadius: '10px', padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>+ {i.other_drug}</span>
                        <span className={`severity-tag tag-${i.severity}`} style={{ fontSize: '0.7rem' }}>{i.severity}</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.5 }}>{i.description}</p>
                    </div>
                  ))}
                </div>
            }
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PATIENTS TAB
═══════════════════════════════════════════════════════════════ */
function PatientsTab({ onLoadPatient }) {
  const [patients, setPatients] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', age: '', conditions: '', allergies: '' });
  const [drugSearch, setDrugSearch] = useState('');
  const [drugResults, setDrugResults] = useState([]);
  const [activePatient, setActivePatient] = useState(null);

  const fetchPatients = async () => {
    const res = await fetch('/api/v1/patients');
    if (res.ok) { const data = await res.json(); setPatients(data); }
  };
  useEffect(() => { fetchPatients(); }, []);

  useEffect(() => {
    if (drugSearch.length < 2) { setDrugResults([]); return; }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/v1/drugs/search?query=${drugSearch}`);
      if (res.ok) setDrugResults(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [drugSearch]);

  const createPatient = async () => {
    if (!form.name.trim()) return alert('Name required');
    await fetch('/api/v1/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, age: form.age ? parseInt(form.age) : null }) });
    setForm({ name: '', age: '', conditions: '', allergies: '' });
    setShowNew(false);
    fetchPatients();
  };

  const deletePatient = async (id) => {
    if (!confirm('Delete this patient?')) return;
    await fetch(`/api/v1/patients/${id}`, { method: 'DELETE' });
    if (activePatient?.patient_id === id) setActivePatient(null);
    fetchPatients();
  };

  const addDrugToPatient = async (drug) => {
    if (!activePatient) return;
    await fetch(`/api/v1/patients/${activePatient.patient_id}/drugs/${drug.drug_id}`, { method: 'POST' });
    setDrugSearch(''); setDrugResults([]);
    const res = await fetch('/api/v1/patients'); const data = await res.json();
    setPatients(data);
    setActivePatient(data.find(p => p.patient_id === activePatient.patient_id));
  };

  const removeDrug = async (drugId) => {
    await fetch(`/api/v1/patients/${activePatient.patient_id}/drugs/${drugId}`, { method: 'DELETE' });
    const res = await fetch('/api/v1/patients'); const data = await res.json();
    setPatients(data);
    setActivePatient(data.find(p => p.patient_id === activePatient.patient_id));
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100%', overflow: 'hidden' }}>
      {/* Patient List */}
      <div style={{ padding: '2rem', overflowY: 'auto', borderRight: '1px solid rgba(148,163,184,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.1rem' }}><Users color="#38bdf8" size={20} /> Patients</h2>
          <button onClick={() => setShowNew(!showNew)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '10px', color: '#38bdf8', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem' }}>
            <UserPlus size={14} /> New
          </button>
        </div>

        {showNew && (
          <div style={{ background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
            <h4 style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>New Patient</h4>
            {[['name','Name *'],['age','Age'],['conditions','Conditions (e.g. Diabetes)'],['allergies','Known Allergies']].map(([key,label]) => (
              <input key={key} placeholder={label} value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})}
                style={{ width: '100%', padding: '0.65rem 0.9rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '8px', color: '#f8fafc', fontFamily: 'inherit', fontSize: '0.88rem', marginBottom: '0.5rem' }} />
            ))}
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button onClick={createPatient} style={{ flex: 1, padding: '0.6rem', background: '#38bdf8', border: 'none', borderRadius: '8px', color: '#020617', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Create</button>
              <button onClick={() => setShowNew(false)} style={{ padding: '0.6rem 1rem', background: 'transparent', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', color: '#64748b', cursor: 'pointer' }}>✕</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {patients.length === 0 && <p style={{ color: '#334155', fontSize: '0.88rem', textAlign: 'center', marginTop: '2rem' }}>No patients yet. Create one!</p>}
          {patients.map(p => (
            <div key={p.patient_id} onClick={() => setActivePatient(p)}
              style={{ padding: '1rem', background: activePatient?.patient_id === p.patient_id ? 'rgba(56,189,248,0.08)' : 'rgba(15,23,42,0.5)',
                border: `1px solid ${activePatient?.patient_id === p.patient_id ? 'rgba(56,189,248,0.3)' : 'rgba(148,163,184,0.08)'}`,
                borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{p.age ? `Age ${p.age}` : ''}{p.conditions ? ` · ${p.conditions}` : ''}</div>
                  <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.25rem' }}>{p.current_medications?.length ?? 0} med{p.current_medications?.length !== 1 ? 's' : ''}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deletePatient(p.patient_id); }}
                  style={{ background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer', padding: '0.25rem' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Patient Detail */}
      <div style={{ padding: '2rem', overflowY: 'auto' }}>
        {!activePatient ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#334155' }}>
            <Users size={60} style={{ opacity: 0.1, marginBottom: '1rem' }} />
            <p>Select a patient to manage their medications</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '1.4rem' }}>{activePatient.name}</h2>
                <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
                  {activePatient.age ? `Age: ${activePatient.age} · ` : ''}{activePatient.conditions || 'No conditions recorded'}
                </p>
                {activePatient.allergies && <p style={{ color: '#ef4444', fontSize: '0.82rem', marginTop: '0.25rem' }}>⚠ Allergies: {activePatient.allergies}</p>}
              </div>
              <button
                onClick={() => onLoadPatient(activePatient.current_medications)}
                disabled={!activePatient.current_medications?.length}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.4rem', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', border: 'none', borderRadius: '12px', color: '#020617', fontWeight: 700, cursor: activePatient.current_medications?.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit', opacity: activePatient.current_medications?.length ? 1 : 0.4 }}>
                <ShieldCheck size={16} /> Check Safety
              </button>
            </div>

            <h4 style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
              Current Medications ({activePatient.current_medications?.length ?? 0})
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '0.75rem', marginBottom: '2rem' }}>
              {activePatient.current_medications?.map(med => (
                <div key={med.drug_id} style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '12px', padding: '0.9rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>{med.brand_name}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{med.generic_name}</div>
                    {med.drug_class_name && <span style={{ fontSize: '0.68rem', color: '#38bdf8', marginTop: '0.25rem', display: 'block' }}>{med.drug_class_name}</span>}
                  </div>
                  <button onClick={() => removeDrug(med.drug_id)} style={{ background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer' }}><X size={14} /></button>
                </div>
              ))}
              {activePatient.current_medications?.length === 0 && <p style={{ color: '#334155', fontSize: '0.88rem' }}>No medications assigned yet.</p>}
            </div>

            <h4 style={{ color: '#94a3b8', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Add Medication</h4>
            <div style={{ position: 'relative', maxWidth: '400px' }}>
              <Search size={16} color="#64748b" style={{ position: 'absolute', top: '16px', left: '14px' }} />
              <input type="text" className="search-input" style={{ paddingLeft: '40px', height: '48px', fontSize: '0.9rem' }}
                placeholder="Search a drug to add…" value={drugSearch} onChange={e => setDrugSearch(e.target.value)} />
            </div>
            {drugResults.length > 0 && (
              <div style={{ marginTop: '0.5rem', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {drugResults.map(d => (
                  <div key={d.drug_id} onClick={() => addDrugToPatient(d)}
                    style={{ padding: '0.7rem 1rem', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{d.brand_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{d.generic_name}</div>
                    </div>
                    <span style={{ color: '#38bdf8', fontSize: '0.85rem', fontWeight: 600 }}>+ Add</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   AUDIT LOG TAB
═══════════════════════════════════════════════════════════════ */
function AuditLogTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchLogs = async () => {
    setLoading(true);
    try { const res = await fetch('/api/v1/audit/history?limit=50'); if (res.ok) setLogs(await res.json()); }
    catch(e) {} finally { setLoading(false); }
  };
  useEffect(() => { fetchLogs(); }, []);
  const actionColor = a => a === 'BLOCKED' ? '#ef4444' : a === 'ALLOWED_WITH_OVERRIDE' ? '#f59e0b' : '#10b981';
  const sevColors = { Contraindicated: '#ef4444', Severe: '#f87171', Moderate: '#f59e0b', Mild: '#fde047' };
  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}><ClipboardList color="#38bdf8" size={24} /> Clinical Audit Trail</h2>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Immutable record of every clinical decision in the system.</p>
        </div>
        <button onClick={fetchLogs} style={{ padding: '0.6rem 1.2rem', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '10px', color: '#38bdf8', cursor: 'pointer', fontFamily: 'inherit' }}>↻ Refresh</button>
      </div>
      {loading ? <div style={{ textAlign: 'center', color: '#64748b', padding: '4rem' }}>Loading...</div> :
       logs.length === 0 ? <div style={{ textAlign: 'center', color: '#64748b', padding: '4rem' }}>No audit records yet.</div> :
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {logs.map(log => (
            <div key={log.log_id} style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.08)', borderLeft: `4px solid ${actionColor(log.action_taken)}`, borderRadius: '12px', padding: '1.1rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  {log.drug_names?.map((n,i) => <span key={i} style={{ background: 'rgba(56,189,248,0.08)', color: '#38bdf8', padding: '0.15rem 0.65rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>{n}</span>)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8rem', color: '#475569' }}>
                  {log.highest_severity && <span style={{ color: sevColors[log.highest_severity] }}>● {log.highest_severity}</span>}
                  <span>{log.interactions_found} interaction{log.interactions_found !== 1 ? 's' : ''}</span>
                  {log.override_reason && <span style={{ color: '#f59e0b' }}>Override: "{log.override_reason.slice(0,50)}..."</span>}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: actionColor(log.action_taken), fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{log.action_taken?.replace(/_/g,' ')}</div>
                <div style={{ color: '#334155', fontSize: '0.72rem', marginTop: '0.2rem' }}>{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</div>
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════════════ */
export default function App() {
  const [activeTab, setActiveTab] = useState('checker');
  const [preloadedDrugs, setPreloadedDrugs] = useState(null);

  const handleLoadPatient = (medications) => {
    setPreloadedDrugs(medications);
    setActiveTab('checker');
  };

  const tabs = [
    { id: 'checker', label: 'Drug Checker', icon: ShieldCheck },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'explorer', label: 'Drug Explorer', icon: Database },
    { id: 'stats', label: 'Statistics', icon: BarChart2 },
    { id: 'audit', label: 'Audit Log', icon: ClipboardList },
  ];

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', height: '64px', flexShrink: 0, background: 'rgba(2,6,23,0.85)', borderBottom: '1px solid rgba(148,163,184,0.08)', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity size={22} color="#38bdf8" />
          <span style={{ fontWeight: 700, fontSize: '1.15rem', background: 'linear-gradient(135deg,#f8fafc,#94a3b8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            DrugInteraction Vault
          </span>
          <span style={{ fontSize: '0.65rem', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', padding: '0.1rem 0.5rem', borderRadius: '20px' }}>Clinical DSS v1.0</span>
        </div>
        <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(15,23,42,0.6)', padding: '0.3rem', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.08)' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.9rem', background: active ? 'rgba(56,189,248,0.12)' : 'transparent', border: active ? '1px solid rgba(56,189,248,0.25)' : '1px solid transparent', borderRadius: '8px', color: active ? '#38bdf8' : '#475569', cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 600 : 400, fontSize: '0.85rem', transition: 'all 0.2s' }}>
                <Icon size={14} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', padding: activeTab === 'checker' ? '1.5rem' : 0 }}>
        {activeTab === 'checker' && <DrugCheckerTab preloadedDrugs={preloadedDrugs} onPreloadConsumed={() => setPreloadedDrugs(null)} />}
        {activeTab === 'patients' && <PatientsTab onLoadPatient={handleLoadPatient} />}
        {activeTab === 'explorer' && <DrugExplorerTab />}
        {activeTab === 'stats' && <div style={{ height: '100%', overflowY: 'auto' }}><StatsTab /></div>}
        {activeTab === 'audit' && <div style={{ height: '100%', overflowY: 'auto' }}><AuditLogTab /></div>}
      </div>
    </div>
  );
}
