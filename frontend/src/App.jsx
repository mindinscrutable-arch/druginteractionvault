import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Database, BarChart2, ClipboardList, Settings, Bot, Activity, Printer, User } from 'lucide-react';
import DrugCheckerTab from './tabs/DrugCheckerTab';
import StatsTab from './tabs/StatsTab';
import DrugExplorerTab from './tabs/DrugExplorerTab';
import PatientsTab from './tabs/PatientsTab';
import AuditLogTab from './tabs/AuditLogTab';
import AdminTab from './tabs/AdminTab';
import ChatbotTab from './tabs/ChatbotTab';
import AccountTab from './tabs/AccountTab';
import Auth from './Auth';

export default function App() {
  const [activeTab, setActiveTab] = useState('checker');
  const [activePatient, setActivePatient] = useState(null);
  const [preloadedDrugs, setPreloadedDrugs] = useState(null);
  const [checkerCartIds, setCheckerCartIds] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  const handleLoadPatient = (patient) => {
    setPreloadedDrugs(patient.current_medications);
    setActivePatient(patient);
    setActiveTab('checker');
  };

  const getRoleFromToken = () => {
    const token = localStorage.getItem('token');
    if (!token) return 'user';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.role || 'user';
    } catch (e) { return 'user'; }
  };

  const userRole = getRoleFromToken();

  const tabs = [
    { id: 'checker', label: 'Drug Checker', icon: ShieldCheck },
    { id: 'patients', label: 'Patients', icon: Users },
    { id: 'explorer', label: 'Drug Explorer', icon: Database },
    { id: 'stats', label: 'Statistics', icon: BarChart2 },
    { id: 'audit', label: 'Audit Log', icon: ClipboardList },
    ...(userRole === 'admin' ? [{ id: 'admin', label: 'Admin', icon: Settings }] : []),
    { id: 'chatbot', label: 'Ask the Vault', icon: Bot },
    { id: 'account', label: 'Account', icon: User },
  ];

  if (!isAuthenticated) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Navigation Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2rem', height: '64px', flexShrink: 0, background: 'rgba(2,6,23,0.85)', borderBottom: '1px solid rgba(148,163,184,0.08)', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity size={28} color="#38bdf8" />
          <span style={{ fontWeight: 800, fontSize: '2rem', background: 'linear-gradient(135deg,#f8fafc,#94a3b8)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.02em' }}>
            DrugInteraction Vault
          </span>
          <span style={{ fontSize: '0.75rem', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)', padding: '0.2rem 0.6rem', borderRadius: '20px', marginLeft: '0.5rem' }}>Clinical DSS v1.0</span>
        </div>

        <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(15,23,42,0.6)', padding: '0.3rem', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.08)' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.2rem', background: active ? 'rgba(56,189,248,0.12)' : 'transparent', border: active ? '1px solid rgba(56,189,248,0.25)' : '1px solid transparent', borderRadius: '8px', color: active ? '#38bdf8' : '#cbd5e1', cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 600 : 500, fontSize: '1.05rem', transition: 'all 0.2s' }}>
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
          <button onClick={handleLogout}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.2rem', background: 'transparent', border: '1px solid transparent', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500, fontSize: '1.05rem', transition: 'all 0.2s', marginLeft: '1rem' }}>
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflow: 'hidden', padding: activeTab === 'checker' ? '1.5rem' : 0 }}>
        {activeTab === 'checker' && <DrugCheckerTab preloadedDrugs={preloadedDrugs} activePatient={activePatient} onPreloadConsumed={() => setPreloadedDrugs(null)} onCartChange={setCheckerCartIds} />}
        {activeTab === 'patients' && <PatientsTab onLoadPatient={handleLoadPatient} />}
        {activeTab === 'explorer' && <DrugExplorerTab />}
        {activeTab === 'stats' && <div style={{ height: '100%', overflowY: 'auto' }}><StatsTab /></div>}
        {activeTab === 'audit' && <div style={{ height: '100%', overflowY: 'auto' }}><AuditLogTab /></div>}
        {activeTab === 'admin' && <div style={{ height: '100%', overflowY: 'auto' }}><AdminTab /></div>}
        {activeTab === 'chatbot' && <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}><ChatbotTab cartDrugIds={checkerCartIds} /></div>}
        {activeTab === 'account' && <div style={{ height: '100%', overflowY: 'auto' }}><AccountTab /></div>}
      </div>
    </div>
  );
}
