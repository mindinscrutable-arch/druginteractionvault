import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ShieldAlert, Database, Zap } from 'lucide-react';

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
  const [activeSection, setActiveSection] = useState('drug'); // 'drug' | 'rule'

  /* drug form */
  const [drugForm, setDrugForm] = useState({ brand_name: '', generic_name: '', drug_class_id: '', description: '' });
  const [drugMsg, setDrugMsg] = useState(null);

  /* rule form */
  const [ruleForm, setRuleForm] = useState({ class1_id: '', class2_id: '', severity: 'Moderate', description: '' });
  const [ruleMsg, setRuleMsg] = useState(null);

  /* load drug classes from DB (no hardcoding) */
  const loadClasses = async () => {
    const res = await fetch('/api/v1/classes');
    if (res.ok) setClasses(await res.json());
  };

  const loadRules = async () => {
    const res = await fetch('/api/v1/admin/class-interactions');
    if (res.ok) setRules(await res.json());
  };

  useEffect(() => { loadClasses(); loadRules(); }, []);

  /* submit drug */
  const submitDrug = async () => {
    if (!drugForm.brand_name || !drugForm.generic_name) return setDrugMsg({ ok: false, text: 'Brand and generic name are required.' });
    const payload = {
      brand_name: drugForm.brand_name,
      generic_name: drugForm.generic_name,
      drug_class_id: drugForm.drug_class_id ? parseInt(drugForm.drug_class_id) : null,
      description: drugForm.description || null,
    };
    const res = await fetch('/api/v1/admin/drugs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
    const res = await fetch('/api/v1/admin/class-interactions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  const deleteRule = async (id) => {
    if (!confirm('Delete this interaction rule?')) return;
    await fetch(`/api/v1/admin/class-interactions/${id}`, { method: 'DELETE' });
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

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {sectionBtn('drug', 'Add Drug', Database)}
          {sectionBtn('rule', 'Add Interaction Rule', Zap)}
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

        {/* ADD RULE */}
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
            {ruleMsg && <div style={{ padding: '0.6rem 1rem', borderRadius: '8px', fontSize: '0.85rem', background: ruleMsg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: ruleMsg.ok ? '#10b981' : '#ef4444', border: `1px solid ${ruleMsg.ok ? '#10b98130' : '#ef444430'}` }}>{ruleMsg.text}</div>}
            <button onClick={submitRule} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: 'linear-gradient(135deg,#f59e0b,#ef4444)', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              <ShieldAlert size={16} /> Create Interaction Rule
            </button>
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
