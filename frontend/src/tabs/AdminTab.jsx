import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ShieldAlert, Database, Zap, Users } from 'lucide-react';

const SEV_OPTIONS = ['Mild', 'Moderate', 'Severe', 'Contraindicated'];

const SEV_COLORS = {
  Contraindicated: '#ef4444',
  Severe: '#f87171',
  Moderate: '#f59e0b',
  Mild: '#fde047',
};

/* ── reusable input style ── */
const inp = {
  width: '100%', padding: '0.65rem 0.9rem',
  background: 'rgba(15,23,42,0.7)',
  border: '1px solid rgba(148,163,184,0.15)',
  borderRadius: '10px', color: '#f8fafc',
  fontFamily: 'inherit', fontSize: '0.88rem',
};

export default function AdminTab() {
  const [classes, setClasses] = useState([]);
  const [rules, setRules] = useState([]);
  const [activeSection, setActiveSection] = useState('drug'); // 'drug' | 'rule' | 'users'
  const [allUsers, setAllUsers] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [error, setError] = useState(null);

  /* drug form */
  const [drugForm, setDrugForm] = useState({ brand_name: '', generic_name: '', drug_class_id: '', description: '' });
  const [drugMsg, setDrugMsg] = useState(null);

  const [ruleForm, setRuleForm] = useState({ class1_id: '', class2_id: '', severity: 'Moderate', description: '' });
  const [ruleMsg, setRuleMsg] = useState(null);
  const [researching, setResearching] = useState(false);

  /* load drug classes from DB (no hardcoding) */
  const loadClasses = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/v1/classes', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setClasses(await res.json());
  };

  const loadRules = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/v1/admin/class-interactions', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) setRules(await res.json());
  };

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAllUsers(await res.json());
      else { const err = await res.json(); setError(err.detail || 'Failed to load users'); }
    } catch (e) { setError('Network error loading users'); }
  };

  const loadAllPatients = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/admin/all-patients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAllPatients(await res.json());
      else { const err = await res.json(); setError(err.detail || 'Failed to load patients'); }
    } catch (e) { setError('Network error loading patients'); }
  };

  const loadAllLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/admin/all-audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setAllLogs(await res.json());
      else { const err = await res.json(); setError(err.detail || 'Failed to load logs'); }
    } catch (e) { setError('Network error loading logs'); }
  };

  useEffect(() => { loadClasses(); loadRules(); loadUsers(); loadAllPatients(); loadAllLogs(); }, []);

  /* submit drug */
  const submitDrug = async () => {
    if (!drugForm.brand_name || !drugForm.generic_name) return setDrugMsg({ ok: false, text: 'Brand and generic name are required.' });
    const payload = {
      brand_name: drugForm.brand_name,
      generic_name: drugForm.generic_name,
      drug_class_id: drugForm.drug_class_id ? parseInt(drugForm.drug_class_id) : null,
      description: drugForm.description || null,
    };
    const token = localStorage.getItem('token');
    const res = await fetch('/api/v1/admin/drugs', { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }, 
      body: JSON.stringify(payload) 
    });
    if (res.ok) {
      const d = await res.json();
      setDrugMsg({ ok: true, text: `✓ Drug "${d.brand_name}" (ID ${d.drug_id}) added successfully!` });
      setDrugForm({ brand_name: '', generic_name: '', drug_class_id: '', description: '' });
    } else {
      const err = await res.json();
      setDrugMsg({ ok: false, text: err.detail || 'Failed to add drug.' });
    }
    setTimeout(() => setDrugMsg(null), 4000);
  };

  /* submit rule */
  const submitRule = async () => {
    if (!ruleForm.class1_id || !ruleForm.class2_id || ruleForm.class1_id === ruleForm.class2_id)
      return setRuleMsg({ ok: false, text: 'Select two different classes.' });
    if (!ruleForm.description.trim())
      return setRuleMsg({ ok: false, text: 'Description is required.' });
    const token = localStorage.getItem('token');
    const res = await fetch('/api/v1/admin/class-interactions', {
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ class1_id: parseInt(ruleForm.class1_id), class2_id: parseInt(ruleForm.class2_id), severity: ruleForm.severity, description: ruleForm.description }),
    });
    if (res.ok) {
      setRuleMsg({ ok: true, text: '✓ Interaction rule created!' });
      setRuleForm({ class1_id: '', class2_id: '', severity: 'Moderate', description: '' });
      loadRules();
    } else {
      const err = await res.json();
      setRuleMsg({ ok: false, text: err.detail || 'Failed.' });
    }
    setTimeout(() => setRuleMsg(null), 4000);
  };

  const researchRule = async () => {
    if (!ruleForm.class1_id || !ruleForm.class2_id || ruleForm.class1_id === ruleForm.class2_id)
      return setRuleMsg({ ok: false, text: 'Select two different classes first.' });
    
    setResearching(true); setRuleMsg({ ok: true, text: 'Gemini is researching clinical data...' });
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/v1/admin/research-interaction?class1_id=${ruleForm.class1_id}&class2_id=${ruleForm.class2_id}`, { 
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setRuleForm({ ...ruleForm, severity: data.severity === 'None' ? 'Mild' : data.severity, description: data.description });
        setRuleMsg({ ok: true, text: '✓ Research complete! Review and save.' });
      } else {
        setRuleMsg({ ok: false, text: 'AI Research failed. Please try again.' });
      }
    } catch (e) {
      setRuleMsg({ ok: false, text: 'Network error during research.' });
    } finally { setResearching(false); }
  };

  const deleteRule = async (id) => {
    if (!confirm('Delete this interaction rule?')) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/v1/admin/class-interactions/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    loadRules();
  };

  const sectionBtn = (id, label, Icon) => (
    <button onClick={() => setActiveSection(id)} style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '0.6rem 1.2rem',
      background: activeSection === id ? 'rgba(56,189,248,0.12)' : 'transparent',
      border: `1px solid ${activeSection === id ? 'rgba(56,189,248,0.3)' : 'rgba(148,163,184,0.1)'}`,
      borderRadius: '10px', color: activeSection === id ? '#38bdf8' : '#64748b',
      cursor: 'pointer', fontFamily: 'inherit', fontWeight: activeSection === id ? 600 : 400, fontSize: '0.88rem',
    }}>
      <Icon size={15} />{label}
    </button>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', padding: '2rem', height: '100%', overflowY: 'auto' }}>

      {/* ── LEFT: Forms ── */}
      <div>
        <h2 style={{ fontWeight: 700, fontSize: '1.4rem', marginBottom: '0.25rem' }}>Admin Panel</h2>
        <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: '1.5rem' }}>
          Live INSERT / DELETE operations directly into the clinical vault database.
        </p>

        {error && (
          <div style={{ padding: '0.8rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', color: '#f87171', fontSize: '0.85rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠ {error}</span>
            <button onClick={() => setError(null)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontWeight: 700 }}>✕</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {sectionBtn('drug', 'Add Drug', Database)}
          {sectionBtn('rule', 'Add Rule', Zap)}
          {sectionBtn('users', 'System Users', Users)}
        </div>

        {/* ADD DRUG */}
        {activeSection === 'drug' && (
          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '0.5rem' }}>Add New Drug</h3>
            <input style={inp} placeholder="Brand Name *" value={drugForm.brand_name} onChange={e => setDrugForm({ ...drugForm, brand_name: e.target.value })} />
            <input style={inp} placeholder="Generic Name *" value={drugForm.generic_name} onChange={e => setDrugForm({ ...drugForm, generic_name: e.target.value })} />
            <select style={inp} value={drugForm.drug_class_id} onChange={e => setDrugForm({ ...drugForm, drug_class_id: e.target.value })}>
              <option value="">— Drug Class (optional) —</option>
              {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
            </select>
            <textarea style={{ ...inp, height: '80px', resize: 'vertical' }} placeholder="Description (optional)" value={drugForm.description} onChange={e => setDrugForm({ ...drugForm, description: e.target.value })} />
            {drugMsg && <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', background: drugMsg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: drugMsg.ok ? '#10b981' : '#ef4444', border: `1px solid ${drugMsg.ok ? '#10b98130' : '#ef444430'}` }}>{drugMsg.text}</div>}
            <button onClick={submitDrug} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', border: 'none', borderRadius: '10px', color: '#020617', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              <Plus size={16} /> Add Drug to Vault
            </button>
          </div>
        )}

        {/* SYSTEM USERS */}
        {activeSection === 'users' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '16px', padding: '1.5rem' }}>
              <h3 style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '1rem' }}>Registered Providers ({allUsers.length})</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {allUsers.map(u => (
                  <div key={u.id} style={{ padding: '0.75rem 1rem', background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{u.email}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Role: {u.role} · Created: {u.created_at?.split('T')[0]}</div>
                    </div>
                    <div style={{ background: 'rgba(56,189,248,0.1)', color: '#38bdf8', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem' }}>
                      {u.patient_count} Patients
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '16px', padding: '1.5rem' }}>
              <h3 style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '1rem' }}>Global Patient Registry ({allPatients.length})</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#64748b', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                      <th style={{ padding: '0.5rem' }}>Name</th>
                      <th style={{ padding: '0.5rem' }}>Owner</th>
                      <th style={{ padding: '0.5rem' }}>Meds</th>
                      <th style={{ padding: '0.5rem' }}>Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allPatients.map(p => (
                      <tr key={p.patient_id} style={{ borderBottom: '1px solid rgba(148,163,184,0.05)' }}>
                        <td style={{ padding: '0.5rem', color: '#e2e8f0' }}>{p.name}</td>
                        <td style={{ padding: '0.5rem', color: '#64748b' }}>{p.owner_email}</td>
                        <td style={{ padding: '0.5rem', color: '#38bdf8', fontSize: '0.7rem' }}>{p.medications?.join(', ') || 'None'}</td>
                        <td style={{ padding: '0.5rem', color: '#64748b' }}>{p.age || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '16px', padding: '1.5rem' }}>
              <h3 style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '1rem' }}>Global Clinical Audit Log ({allLogs.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {allLogs.map(log => (
                  <div key={log.id} style={{ padding: '0.75rem', background: 'rgba(15,23,42,0.4)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '10px', fontSize: '0.78rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ color: '#38bdf8', fontWeight: 600 }}>{log.owner_email}</span>
                      <span style={{ color: '#64748b' }}>{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ color: log.action === 'BLOCKED' ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>{log.action}</span>
                      <span style={{ color: '#94a3b8' }}>Risk Score: {log.risk_score}</span>
                    </div>
                    {log.details && <div style={{ marginTop: '0.4rem', color: '#64748b', fontStyle: 'italic' }}>{log.details}</div>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {activeSection === 'rule' && (
          <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '0.5rem' }}>Add Class Interaction Rule</h3>
            <select style={inp} value={ruleForm.class1_id} onChange={e => setRuleForm({ ...ruleForm, class1_id: e.target.value })}>
              <option value="">— Class 1 * —</option>
              {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
            </select>
            <select style={inp} value={ruleForm.class2_id} onChange={e => setRuleForm({ ...ruleForm, class2_id: e.target.value })}>
              <option value="">— Class 2 * —</option>
              {classes.map(c => <option key={c.class_id} value={c.class_id}>{c.class_name}</option>)}
            </select>
            <select style={inp} value={ruleForm.severity} onChange={e => setRuleForm({ ...ruleForm, severity: e.target.value })}>
              {SEV_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <textarea style={{ ...inp, height: '90px', resize: 'vertical' }} placeholder="Clinical description of interaction * " value={ruleForm.description} onChange={e => setRuleForm({ ...ruleForm, description: e.target.value })} />
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={researchRule} disabled={researching} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)', borderRadius: '10px', color: '#38bdf8', fontWeight: 600, cursor: researching ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                <Zap size={16} /> {researching ? 'Researching...' : 'Auto-Generate with Gemini'}
              </button>
              <button onClick={submitRule} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                <ShieldAlert size={16} /> Save Rule
              </button>
            </div>
            {ruleMsg && <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', background: ruleMsg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: ruleMsg.ok ? '#10b981' : '#ef4444', border: `1px solid ${ruleMsg.ok ? '#10b98130' : '#ef444430'}` }}>{ruleMsg.text}</div>}
          </div>
        )}
      </div>

      {/* ── RIGHT: Existing Rules Table ── */}
      <div>
        <h3 style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '1rem', color: '#e2e8f0' }}>
          Class Interaction Rules ({rules.length})
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
          {rules.length === 0 && <p style={{ color: '#475569', fontSize: '0.88rem' }}>No rules yet.</p>}
          {rules.map(r => (
            <div key={r.interaction_id} style={{
              background: 'rgba(15,23,42,0.6)',
              border: `1px solid ${SEV_COLORS[r.severity] ?? '#64748b'}25`,
              borderLeft: `3px solid ${SEV_COLORS[r.severity] ?? '#64748b'}`,
              borderRadius: '10px', padding: '0.85rem 1rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                  {r.class1} <span style={{ color: '#475569' }}>×</span> {r.class2}
                </div>
                <span style={{ fontSize: '0.72rem', color: SEV_COLORS[r.severity], fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.severity}</span>
                <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.3rem', lineHeight: 1.5, whiteSpace: 'normal', wordBreak: 'break-word' }}>{r.description}</p>
              </div>
              <button onClick={() => deleteRule(r.interaction_id)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', padding: '0.35rem 0.6rem', flexShrink: 0 }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
