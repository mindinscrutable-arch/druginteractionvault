import React, { useState, useEffect, useCallback } from 'react';
import { Database, Search, ChevronLeft, ChevronRight, Pill } from 'lucide-react';

const DRUG_PAGE_SIZE = 20;
const SEV_COLORS = { Contraindicated: '#ef4444', Severe: '#f87171', Moderate: '#f59e0b', Mild: '#fde047' };

export default function DrugExplorerTab() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [drugInteractions, setDrugInteractions] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchDrugs = useCallback(async (p = 1, s = '') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/drugs?page=${p}&limit=${DRUG_PAGE_SIZE}&search=${encodeURIComponent(s)}`);
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
                    <div key={idx} style={{ background: 'rgba(15,23,42,0.6)', border: `1px solid ${SEV_COLORS[i.severity]}25`, borderLeft: `3px solid ${SEV_COLORS[i.severity]}`, borderRadius: '10px', padding: '0.85rem 1rem' }}>
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
