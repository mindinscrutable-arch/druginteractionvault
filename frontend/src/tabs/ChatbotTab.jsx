import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader, ShieldCheck } from 'lucide-react';

/* Formats markdown-like bold **text** → <strong>text</strong> */
function formatAnswer(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ color: '#f8fafc' }}>{p.slice(2, -2)}</strong>
      : p
  );
}

const SUGGESTED = [
  "What are the risks of combining Warfarin and Ibuprofen?",
  "Is it safe to take Lithium and Ibuprofen together?",
  "Explain the danger of mixing MAO inhibitors with SSRIs.",
  "Can a patient on Metoprolol take Sudafed for a cold?",
  "What happens when Fluconazole is combined with a Statin?",
];

export default function ChatbotTab({ cartDrugIds = [] }) {
  const [dynamicSuggested, setDynamicSuggested] = useState(SUGGESTED);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello! I'm the **DrugInteraction Vault AI**, powered by Gemini and backed by your live clinical database.\n\nYou can ask me questions like:\n- "Is it safe to combine Warfarin and Aspirin?"\n- "What are the risks of mixing opioids and benzodiazepines?"\n\nIf you have drugs loaded in the Drug Checker, I'll automatically use those as context.`,
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (question) => {
    const q = (question || input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: q, drug_ids: cartDrugIds }),
      });
      if (res.ok) {
        const data = await res.json();
        let answer = data.answer;
        
        // Parse dynamic suggestions
        if (answer.includes('SUGGESTED_QUESTIONS:')) {
          const parts = answer.split('SUGGESTED_QUESTIONS:');
          answer = parts[0].trim();
          const qList = parts[1].trim().split('\n')
            .map(line => line.replace(/^-\s*/, '').trim())
            .filter(line => line.length > 5);
          if (qList.length > 0) setDynamicSuggested(qList);
        }
        
        setMessages(prev => [...prev, { role: 'assistant', text: answer }]);
      } else {
        const err = await res.json();
        setMessages(prev => [...prev, { role: 'assistant', text: `⚠ Error: ${err.detail || 'Failed to reach AI.'}`, isError: true }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', text: '⚠ Could not connect to the AI service. Error: ' + err.message, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid rgba(148,163,184,0.08)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bot size={18} color="#020617" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>Ask the Vault AI</div>
          <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
            Gemini 2.5 Flash · Grounded in live DB
            {cartDrugIds.length > 0 && <span style={{ color: '#38bdf8', marginLeft: '0.5rem' }}>· {cartDrugIds.length} drug{cartDrugIds.length > 1 ? 's' : ''} from checker as context</span>}
          </div>
        </div>
        {cartDrugIds.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#38bdf8', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: '8px', padding: '0.3rem 0.75rem' }}>
            <ShieldCheck size={13} /> Using active prescription context
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.75rem', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
            {/* Avatar */}
            <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: msg.role === 'user' ? 'rgba(129,140,248,0.2)' : 'linear-gradient(135deg,#38bdf8,#818cf8)' }}>
              {msg.role === 'user' ? <User size={15} color="#818cf8" /> : <Bot size={15} color="#020617" />}
            </div>
            {/* Bubble */}
            <div style={{
              maxWidth: '72%', padding: '0.9rem 1.1rem',
              background: msg.role === 'user' ? 'rgba(129,140,248,0.12)' : 'rgba(15,23,42,0.7)',
              border: msg.role === 'user' ? '1px solid rgba(129,140,248,0.2)' : '1px solid rgba(148,163,184,0.1)',
              borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
              fontSize: '0.88rem', lineHeight: 1.7, color: msg.isError ? '#ef4444' : '#cbd5e1',
              whiteSpace: 'pre-wrap',
            }}>
              {formatAnswer(msg.text)}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#38bdf8,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={15} color="#020617" />
            </div>
            <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: '4px 16px 16px 16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
              {[0, 1, 2].map(d => (
                <div key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: '#38bdf8', animation: 'pulse 1.2s infinite', animationDelay: `${d * 0.2}s` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions (Dynamic) */}
      <div style={{ padding: '0.5rem 2rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid rgba(148,163,184,0.04)' }}>
        <span style={{ fontSize: '0.75rem', color: '#64748b', width: '100%', marginBottom: '0.4rem' }}>Follow-up questions based on our discussion:</span>
        {dynamicSuggested.map((s, i) => (
          <button key={i} onClick={() => send(s)} disabled={loading} style={{
            padding: '0.4rem 0.9rem', background: 'rgba(56,189,248,0.06)',
            border: '1px solid rgba(56,189,248,0.2)', borderRadius: '20px',
            color: '#38bdf8', fontSize: '0.78rem', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            transition: 'all 0.2s',
          }}>{s}</button>
        ))}
      </div>

      {/* Input Bar */}
      <div style={{ padding: '1rem 2rem', borderTop: '1px solid rgba(148,163,184,0.08)', flexShrink: 0, display: 'flex', gap: '0.75rem' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask a clinical question about drug interactions…"
          style={{ flex: 1, padding: '0.75rem 1rem', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: '12px', color: '#f8fafc', fontFamily: 'inherit', fontSize: '0.9rem' }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()}
          style={{ padding: '0.75rem 1.25rem', background: loading || !input.trim() ? 'rgba(56,189,248,0.2)' : 'linear-gradient(135deg,#38bdf8,#818cf8)', border: 'none', borderRadius: '12px', color: '#020617', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
          {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
