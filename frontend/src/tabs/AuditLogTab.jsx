import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList } from 'lucide-react';

const AUDIT_PAGE_SIZE = 50;
const SEV_COLORS = { Contraindicated: '#ef4444', Severe: '#f87171', Moderate: '#f59e0b', Mild: '#fde047' };

export default function AuditLogTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(AUDIT_PAGE_SIZE);

  const fetchLogs = useCallback(async (fetchLimit = limit) => {
    setLoading(true);
    try { 
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/audit/history?limit=${fetchLimit}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }); 
      if (res.ok) setLogs(await res.json()); 
    }
    catch(e) {} finally { setLoading(false); }
  }, [limit]);

  useEffect(() => { fetchLogs(); }, []);

  const loadMore = () => {
    const newLimit = limit + AUDIT_PAGE_SIZE;
    setLimit(newLimit);
    fetchLogs(newLimit);
  };
  const actionColor = a => a === 'BLOCKED' ? '#ef4444' : a === 'ALLOWED_WITH_OVERRIDE' ? '#f59e0b' : '#10b981';
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
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {logs.map(log => (
            <div key={log.log_id} style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.08)', borderLeft: `4px solid ${actionColor(log.action_taken)}`, borderRadius: '12px', padding: '1.1rem 1.5rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  {log.drug_names?.map((n,i) => <span key={i} style={{ background: 'rgba(56,189,248,0.08)', color: '#38bdf8', padding: '0.15rem 0.65rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600 }}>{n}</span>)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.8rem', color: '#475569' }}>
                  {log.highest_severity && <span style={{ color: SEV_COLORS[log.highest_severity] }}>● {log.highest_severity}</span>}
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
          {logs.length >= limit && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <button onClick={loadMore}
                style={{ padding: '0.6rem 2rem', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '10px', color: '#38bdf8', cursor: 'pointer', fontFamily: 'inherit' }}>
                Load More
              </button>
            </div>
          )}
        </>
      }
    </div>
  );
}
