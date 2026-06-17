import React, { useState, useRef, useEffect, memo } from 'react';
import { ExternalLink } from 'lucide-react';
import type { Column } from '../../types/proposals';
import { OPTION_COLOR_STYLES } from '../../types/proposals';

interface CellProps {
  column: Column;
  value: string;
  cellKey: string;
  onChange: (value: string) => void;
  onNavigate: (rowDelta: number, colDelta: number) => void;
}

export const TableCell = memo(({ column, value, cellKey, onChange, onNavigate }: CellProps) => {
  const [draft, setDraft]     = useState(value);
  const [editing, setEditing] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);
  const dropRef   = useRef<HTMLDivElement>(null);
  const committed = useRef(false);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return;
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [dropOpen]);

  const commit = (nav?: () => void) => {
    if (committed.current) return;
    committed.current = true;
    setEditing(false);
    if (draft !== value) onChange(draft);
    requestAnimationFrame(() => { committed.current = false; nav?.(); });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape')  { e.preventDefault(); setDraft(value); setEditing(false); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(() => onNavigate(1, 0)); return; }
    if (e.key === 'Tab')     { e.preventDefault(); commit(() => onNavigate(0, e.shiftKey ? -1 : 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); commit(() => onNavigate(-1, 0)); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); commit(() => onNavigate(1, 0)); return; }
  };

  const viewKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); setEditing(true); return; }
    if (e.key === 'Tab')      { e.preventDefault(); onNavigate(0, e.shiftKey ? -1 : 1); return; }
    if (e.key === 'ArrowUp')  { e.preventDefault(); onNavigate(-1, 0); return; }
    if (e.key === 'ArrowDown'){ e.preventDefault(); onNavigate(1, 0); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { setDraft(''); setEditing(true); }
  };

  // ── Dropdown ──
  if (column.type === 'dropdown') {
    const options = column.options ?? [];
    const selected = options.find(o => o.id === value);
    const style = selected ? (OPTION_COLOR_STYLES[selected.color]?.full ?? 'bg-slate-100 text-slate-600') : '';
    return (
      <div ref={dropRef} className="relative w-full h-full">
        <button data-cell={cellKey} tabIndex={0}
          onClick={() => setDropOpen(o => !o)}
          onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); onNavigate(0, e.shiftKey ? -1 : 1); } }}
          className="w-full h-full flex items-center px-2.5 hover:bg-slate-50 focus:outline-none focus:bg-blue-50 transition-colors">
          {selected
            ? <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${style}`}>{selected.label}</span>
            : <span className="text-slate-300 text-xs">—</span>
          }
        </button>
        {dropOpen && (
          <div className="absolute top-full left-0 mt-0.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl min-w-40 py-1"
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
            <button onClick={() => { onChange(''); setDropOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-50">— Clear</button>
            {options.map(opt => (
              <button key={opt.id} onClick={() => { onChange(opt.id); setDropOpen(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${OPTION_COLOR_STYLES[opt.color]?.full ?? ''}`}>{opt.label}</span>
                {value === opt.id && <span className="ml-auto text-blue-500 text-xs">✓</span>}
              </button>
            ))}
            {options.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No options — right-click column to add</p>}
          </div>
        )}
      </div>
    );
  }

  // ── Date ──
  if (column.type === 'date') {
    return (
      <input data-cell={cellKey} tabIndex={0} type="date" value={value || ''}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Tab')      { e.preventDefault(); onNavigate(0, e.shiftKey ? -1 : 1); }
          if (e.key === 'Enter')    { e.preventDefault(); onNavigate(1, 0); }
          if (e.key === 'ArrowUp')  { e.preventDefault(); onNavigate(-1, 0); }
          if (e.key === 'ArrowDown'){ e.preventDefault(); onNavigate(1, 0); }
        }}
        className="w-full h-full px-2.5 text-xs text-slate-700 bg-transparent outline-none hover:bg-slate-50 focus:bg-blue-50 cursor-pointer"
      />
    );
  }

  // ── Link ──
  if (column.type === 'link') {
    if (editing) return (
      <input ref={inputRef} data-cell={cellKey} tabIndex={0} type="url"
        value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={() => commit()} onKeyDown={handleKeyDown}
        placeholder="https://..."
        className="w-full h-full px-2.5 text-xs text-blue-600 bg-blue-50 outline-none ring-1 ring-inset ring-blue-300"
      />
    );
    return (
      <div data-cell={cellKey} tabIndex={0}
        onClick={() => setEditing(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'F2') { setEditing(true); return; } viewKeyDown(e); }}
        className="w-full h-full flex items-center gap-1.5 px-2.5 hover:bg-slate-50 cursor-text focus:outline-none focus:bg-blue-50 group/link">
        {value
          ? <><span className="text-blue-600 text-xs truncate underline flex-1">{value}</span>
              <a href={value} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} tabIndex={-1}
                className="opacity-0 group-hover/link:opacity-100 text-slate-400 hover:text-blue-600 flex-shrink-0">
                <ExternalLink size={11} />
              </a>
            </>
          : <span className="text-slate-300 text-xs">—</span>
        }
      </div>
    );
  }

  // ── Text / Number ──
  if (editing) return (
    <input ref={inputRef} data-cell={cellKey} tabIndex={0}
      type={column.type === 'number' ? 'number' : 'text'}
      value={draft} onChange={e => setDraft(e.target.value)}
      onBlur={() => commit()} onKeyDown={handleKeyDown}
      className="w-full h-full px-2.5 text-xs text-slate-700 bg-blue-50 outline-none ring-1 ring-inset ring-blue-300"
    />
  );

  return (
    <div data-cell={cellKey} tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={viewKeyDown}
      className="w-full h-full flex items-center px-2.5 hover:bg-slate-50 cursor-text focus:outline-none focus:bg-blue-50">
      {value
        ? <span className={`text-xs text-slate-700 truncate ${column.type === 'number' ? 'tabular-nums' : ''}`}>
            {column.type === 'number' ? Number(value).toLocaleString() : value}
          </span>
        : <span className="text-slate-300 text-xs">—</span>
      }
    </div>
  );
});
