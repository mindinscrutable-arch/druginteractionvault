import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Trash2, ShieldCheck, X, Search } from 'lucide-react';

const SEARCH_MIN_CHARS = 3;

export default function PatientsTab({ onLoadPatient }) {
  const [patients, setPatients] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', age: '', conditions: '', allergies: '' });
  const [drugSearch, setDrugSearch] = useState('');
  const [drugResults, setDrugResults] = useState([]);
  const [activePatient, setActivePatient] = useState(null);

  const fetchPatients = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/v1/patients', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) { const data = await res.json(); setPatients(data); }
  };
  useEffect(() => { fetchPatients(); }, []);

  useEffect(() => {
    if (drugSearch.length < SEARCH_MIN_CHARS) { setDrugResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/drugs/search?query=${encodeURIComponent(drugSearch)}`);
        if (res.ok) setDrugResults(await res.json());
      } catch(e) { console.error('Patient drug search failed:', e); }
    }, 300);
    return () => clearTimeout(t);
  }, [drugSearch]);

  const createPatient = async () => {
    if (!form.name.trim()) return alert('Name required');
    const token = localStorage.getItem('token');
    await fetch('/api/v1/patients', { 
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }, 
      body: JSON.stringify({ ...form, age: form.age ? parseInt(form.age) : null }) 
    });
    setForm({ name: '', email: '', age: '', conditions: '', allergies: '' });
    setShowNew(false);
    fetchPatients();
  };

  const deletePatient = async (id) => {
    if (!window.confirm('Delete this patient?')) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/v1/patients/${id}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (activePatient?.patient_id === id) setActivePatient(null);
    fetchPatients();
  };

  const addDrugToPatient = async (drug) => {
    if (!activePatient) return;
    const token = localStorage.getItem('token');
    await fetch(`/api/v1/patients/${activePatient.patient_id}/drugs/${drug.drug_id}`, { 
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    setDrugSearch(''); setDrugResults([]);
    fetchPatients();
  };

  const removeDrug = async (drugId) => {
    const token = localStorage.getItem('token');
    await fetch(`/api/v1/patients/${activePatient.patient_id}/drugs/${drugId}`, { 
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchPatients();
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
            {[['name','Name *'],['email','Email (for reports)'],['age','Age'],['conditions','Conditions (e.g. Diabetes)'],['allergies','Known Allergies']].map(([key,label]) => (
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
                  <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    {p.age ? `Age ${p.age}` : ''}{p.conditions ? ` · ${p.conditions}` : ''}
                  </div>
                  {p.email && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>✉ {p.email}</div>}
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
                onClick={() => onLoadPatient(activePatient)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.7rem 1.4rem', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', border: 'none', borderRadius: '12px', color: '#020617', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
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
