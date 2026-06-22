import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Maximize2, Minimize2, Send, Trash2, Bot, User, Loader2 } from 'lucide-react';
import { useProposals } from '../../context/ProposalContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SAMPLE_QUESTIONS = [
  'How many submissions were made this month?',
  'Which profile performed best this quarter?',
  'How many leads did we lose last month?',
  'Which month had the highest activity?',
  'How many leads are at Contacted stage?',
  'Which SDR has the most submissions?',
];

const WELCOME = `Ask anything about your system data — performance, leads, submissions, profiles, dates, and trends.`;

function formatMessage(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('**') && line.endsWith('**'))
      return <p key={i} className="font-bold text-slate-800 mt-2 first:mt-0">{line.slice(2,-2)}</p>;
    if (line.startsWith('* ') || line.startsWith('• ') || line.startsWith('- '))
      return <li key={i} className="ml-3 list-disc text-slate-700">{line.slice(2)}</li>;
    if (line.trim() === '') return <div key={i} className="h-1" />;
    return <p key={i} className="text-slate-700">{line}</p>;
  });
}

export const DataAssistant: React.FC = () => {
  const { columns, rows, priorityRecords } = useProposals();
  const [open,      setOpen]      = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const buildContext = useCallback(() => {
    const now = new Date();
    const MO: Record<string,string> = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};

    const optMap: Record<string, Record<string,string>> = {};
    for (const col of columns) {
      if (col.type === 'dropdown' && col.options) {
        optMap[col.id] = {};
        for (const opt of col.options as {id:string;label:string}[]) {
          optMap[col.id][opt.id] = opt.label;
          optMap[col.id][opt.label.toLowerCase()] = opt.label;
        }
      }
    }
    const resolve = (colId: string, val: string) => optMap[colId]?.[val] ?? val;

    const statusCol  = columns.find(c => c.name.toLowerCase().includes('status') && c.type === 'dropdown');
    const dateCol    = columns.find(c => c.type === 'date' || c.name.toLowerCase().includes('date'));
    const sdrCol     = columns.find(c => c.name.toLowerCase().includes('sdr'));
    const profileCol = columns.find(c => c.name.toLowerCase().includes('profile'));

    const normDate = (v: string) => {
      if (!v) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
      const m1 = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (m1) return `${m1[3]}-${m1[1].padStart(2,'0')}-${m1[2].padStart(2,'0')}`;
      const m2 = v.match(/^(\d{1,2})[- ]([A-Za-z]{3})[- ](\d{4})$/);
      if (m2) { const mo = MO[m2[2].toLowerCase()]; if (mo) return `${m2[3]}-${mo}-${m2[1].padStart(2,'0')}`; }
      return v;
    };

    const statusBreakdown: Record<string,number> = {};
    if (statusCol) {
      for (const row of rows) {
        const label = resolve(statusCol.id, row.data[statusCol.id] ?? '') || 'Unknown';
        statusBreakdown[label] = (statusBreakdown[label] ?? 0) + 1;
      }
    }

    const sdrBreakdown: Record<string,number> = {};
    if (sdrCol) {
      for (const row of rows) {
        const label = resolve(sdrCol.id, row.data[sdrCol.id] ?? '') || 'Unknown';
        sdrBreakdown[label] = (sdrBreakdown[label] ?? 0) + 1;
      }
    }

    const profileBreakdown: Record<string,number> = {};
    if (profileCol) {
      for (const row of rows) {
        const label = resolve(profileCol.id, row.data[profileCol.id] ?? '') || 'Unknown';
        profileBreakdown[label] = (profileBreakdown[label] ?? 0) + 1;
      }
    }

    const monthly: Record<string,number> = {};
    if (dateCol) {
      for (const row of rows) {
        const d = normDate(row.data[dateCol.id] ?? '');
        if (d && /^\d{4}-\d{2}/.test(d)) {
          const mo = d.slice(0,7);
          monthly[mo] = (monthly[mo] ?? 0) + 1;
        }
      }
    }

    const rowSamples = rows.slice(0, 500).map(row => {
      const parts: string[] = [];
      if (row.display_id) parts.push(`ID:${row.display_id}`);
      for (const col of columns) {
        const raw = row.data[col.id] ?? '';
        if (!raw) continue;
        parts.push(`${col.name}:${resolve(col.id, raw)}`);
      }
      return parts.join(', ');
    });

    return `You are an AI data assistant for TrackHub.
Today: ${now.toISOString().slice(0,10)}

TOTAL RECORDS: ${rows.length}
COLUMNS: ${columns.map(c => `${c.name}(${c.type})`).join(', ')}

STATUS BREAKDOWN:
${Object.entries(statusBreakdown).map(([k,v]) => `  ${k}: ${v}`).join('\n') || '  No data'}

${sdrCol ? `SDR BREAKDOWN:\n${Object.entries(sdrBreakdown).map(([k,v]) => `  ${k}: ${v}`).join('\n')}` : ''}

${profileCol ? `PROFILE BREAKDOWN:\n${Object.entries(profileBreakdown).map(([k,v]) => `  ${k}: ${v}`).join('\n')}` : ''}

${dateCol ? `MONTHLY COUNTS:\n${Object.entries(monthly).sort(([a],[b])=>b.localeCompare(a)).slice(0,24).map(([k,v]) => `  ${k}: ${v}`).join('\n')}` : ''}

LEAD PRIORITY: ${priorityRecords.length} scored leads
${priorityRecords.slice(0,50).map(r => `  ${r.unique_id}: score=${r.score}, tier=${r.tier}`).join('\n')}

RECORDS (first 500):
${rowSamples.join('\n')}

RULES:
- Answer ONLY from data above. Never guess or use outside knowledge.
- If data unavailable: "This information is not available in the system."
- If unclear: ask ONE short clarification question.
- Always include Source (module, date range, filters, record count, IDs).
- Support natural language and typos.
- Show calculation breakdown when relevant.
- Understand: today/this week/this month/last month/last quarter/this year etc.`;
  }, [columns, rows, priorityRecords]);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: `u${Date.now()}`, role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role as 'user'|'assistant', content: m.content }));
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: buildContext(),
          messages: [...history, { role: 'user', content: text.trim() }],
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API error ${res.status}`);
      }

      const data = await res.json();
      const reply = data.content?.map((b: {type:string;text?:string}) => b.text || '').join('') || 'Sorry, I could not process that.';
      setMessages(prev => [...prev, { id: `a${Date.now()}`, role: 'assistant', content: reply }]);
    } catch (err: any) {
      const msg = err?.message?.includes('API key') 
        ? 'API key not configured. Please contact your administrator.'
        : `Error: ${err?.message || 'Something went wrong. Please try again.'}`;
      setMessages(prev => [...prev, { id: `e${Date.now()}`, role: 'assistant', content: msg }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, buildContext]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="fixed bottom-6 right-6 z-[9999] w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 group"
      style={{ boxShadow: '0 8px 32px rgba(37,99,235,0.45)' }}>
      <MessageCircle size={24} />
      <span className="absolute right-16 bg-slate-800 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        AI Data Assistant
      </span>
    </button>
  );

  const wClass = maximized
    ? 'fixed inset-4 z-[9999] flex flex-col'
    : 'fixed bottom-6 right-6 z-[9999] flex flex-col w-[380px] h-[580px]';

  return (
    <div className={`${wClass} bg-white rounded-2xl border border-slate-200 overflow-hidden`}
      style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-blue-600 flex-shrink-0">
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
          <Bot size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white leading-none">AI Data Assistant</p>
          <p className="text-xs text-blue-200 mt-0.5">{rows.length.toLocaleString()} records loaded</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMessages([])} title="Clear chat"
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white">
            <Trash2 size={14} />
          </button>
          <button onClick={() => setMaximized(m => !m)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white">
            {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={() => { setOpen(false); setMaximized(false); }}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="flex gap-2.5">
              <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={13} className="text-blue-600" />
              </div>
              <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm border border-slate-100 max-w-xs">
                <p className="text-xs text-slate-600 leading-relaxed">{WELCOME}</p>
              </div>
            </div>
            <div className="pl-9 space-y-1.5">
              {SAMPLE_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => send(q)}
                  className="block w-full text-left text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-100 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-blue-100'}`}>
              {msg.role === 'user' ? <User size={13} className="text-white" /> : <Bot size={13} className="text-blue-600" />}
            </div>
            <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
              msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-100 shadow-sm rounded-tl-sm'
            }`}>
              {msg.role === 'user' ? msg.content : <div className="space-y-0.5">{formatMessage(msg.content)}</div>}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot size={13} className="text-blue-600" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-3 shadow-sm border border-slate-100 flex items-center gap-2">
              <Loader2 size={13} className="text-blue-500 animate-spin" />
              <span className="text-xs text-slate-400">Analysing your data...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-3 bg-white border-t border-slate-100">
        <div className="flex items-end gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-300 focus-within:bg-white transition-all">
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Ask anything about your data..."
            rows={1} className="flex-1 text-sm text-slate-700 placeholder-slate-400 bg-transparent outline-none resize-none max-h-24"
            style={{ minHeight: 22 }} />
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            className="flex-shrink-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg flex items-center justify-center transition-colors">
            <Send size={13} />
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-1 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
};
