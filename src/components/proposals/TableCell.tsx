import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ExternalLink } from 'lucide-react';
import type { Column } from '../../types/proposals';
import { OPTION_COLOR_STYLES, getFunnelStatusStyle } from '../../types/proposals';

interface CellProps {
  column: Column;
  value: string;
  cellKey: string;
  onChange: (value: string) => void;
  onNavigate: (rowDelta: number, colDelta: number) => void;
}

// ── Dropdown rendered via portal so it escapes table overflow:hidden ──────────
const DropdownPortal: React.FC<{
  options: Column['options'];
  value: string;
  anchorRef: React.RefObject<HTMLElement | null>;
  onSelect: (id: string) => void;
  onClose: () => void;
}> = ({ options, value, anchorRef, onSelect, onClose }) => {
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  // Position below the anchor button
  useEffect(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + window.scrollY + 2, left: r.left + window.scrollX, width: Math.max(r.width, 160) });
  }, [anchorRef]);

  // Close on outside click — use mousedown so it fires before the click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Tiny delay so the opening click doesn't immediately close
    const t = setTimeout(() => document.addEventListener('mousedown', h), 80);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', h); };
  }, [anchorRef, onClose]);

  const opts = options ?? [];

  return createPortal(
    <div
      ref={panelRef}
      className="fixed bg-white border border-slate-200 rounded-xl shadow-2xl py-1 z-[9999]"
      style={{ top: pos.top, left: pos.left, minWidth: pos.width, boxShadow: '0 8px 32px rgba(0,0,0,0.14)' }}
    >
      <button
        onMouseDown={e => { e.preventDefault(); onSelect(''); }}
        className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-50 transition-colors"
      >
        — Clear
      </button>
      {opts.length === 0 ? (
        <p className="px-3 py-2 text-xs text-slate-400 italic">No options — right-click column header to add</p>
      ) : (
        opts.map(opt => (
          <button
            key={opt.id}
            onMouseDown={e => { e.preventDefault(); onSelect(opt.id); }}
            className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors"
          >
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${OPTION_COLOR_STYLES[opt.color]?.full ?? 'bg-slate-100 text-slate-600'}`}>
              {opt.label}
            </span>
            {value === opt.id && <span className="ml-auto text-blue-500 text-xs font-bold">✓</span>}
          </button>
        ))
      )}
    </div>,
    document.body
  );
};

// ── Main cell ─────────────────────────────────────────────────────────────────
export const TableCell = memo(({ column, value, cellKey, onChange, onNavigate }: CellProps) => {
  const [draft, setDraft]     = useState(value);
  const [editing, setEditing] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const inputRef   = useRef<HTMLInputElement>(null);
  const buttonRef  = useRef<HTMLButtonElement>(null);
  const committed  = useRef(false);

  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  useEffect(() => {
    if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); }
  }, [editing]);

  const commit = useCallback((nav?: () => void) => {
    if (committed.current) return;
    committed.current = true;
    setEditing(false);
    if (draft !== value) onChange(draft);
    requestAnimationFrame(() => { committed.current = false; nav?.(); });
  }, [draft, value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape')     { e.preventDefault(); setDraft(value); setEditing(false); return; }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(() => onNavigate(1, 0)); return; }
    if (e.key === 'Tab')        { e.preventDefault(); commit(() => onNavigate(0, e.shiftKey ? -1 : 1)); return; }
    if (e.key === 'ArrowUp')    { e.preventDefault(); commit(() => onNavigate(-1, 0)); return; }
    if (e.key === 'ArrowDown')  { e.preventDefault(); commit(() => onNavigate(1, 0)); return; }
  }, [commit, onNavigate, value]);

  const viewKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); setEditing(true); return; }
    if (e.key === 'Tab')       { e.preventDefault(); onNavigate(0, e.shiftKey ? -1 : 1); return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); onNavigate(-1, 0); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); onNavigate(1, 0); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) { setDraft(''); setEditing(true); }
  }, [onNavigate]);

  // ── Dropdown ──────────────────────────────────────────────────────────────
  if (column.type === 'dropdown') {
    const options = column.options ?? [];
    const selected = options.find(o => o.id === value);
    const badgeStyle = selected
      ? (OPTION_COLOR_STYLES[selected.color]?.full ?? 'bg-slate-100 text-slate-600')
      : '';

    return (
      <div className="w-full h-full relative">
        <button
          ref={buttonRef}
          data-cell={cellKey}
          tabIndex={0}
          onClick={() => setDropOpen(o => !o)}
          onKeyDown={e => {
            if (e.key === 'Tab')   { e.preventDefault(); onNavigate(0, e.shiftKey ? -1 : 1); }
            if (e.key === 'Enter') { e.preventDefault(); setDropOpen(o => !o); }
            if (e.key === 'Escape') setDropOpen(false);
          }}
          className="w-full h-full flex items-center px-2.5 hover:bg-slate-50 focus:outline-none focus:bg-blue-50 transition-colors"
        >
          {selected
            ? <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${getFunnelStatusStyle(selected.label).full || badgeStyle}`}>{selected.label}</span>
            : <span className="text-slate-300 text-xs">Click to select</span>
          }
        </button>

        {dropOpen && (
          <DropdownPortal
            options={column.options}
            value={value}
            anchorRef={buttonRef}
            onSelect={id => { onChange(id); setDropOpen(false); }}
            onClose={() => setDropOpen(false)}
          />
        )}
      </div>
    );
  }

  // ── Date ──────────────────────────────────────────────────────────────────
  if (column.type === 'date') {
    return (
      <input
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        onClick={e => e.stopPropagation()}
        onFocus={e => e.stopPropagation()}
        onKeyDown={e => {
          if (e.key === 'Tab')    { e.preventDefault(); onNavigate(0, e.shiftKey ? -1 : 1); }
          if (e.key === 'Enter')  { e.preventDefault(); onNavigate(1, 0); }
          if (e.key === 'Escape') { e.preventDefault(); onNavigate(0, 0); }
        }}
        placeholder="dd/mm/yyyy"
        className="w-full h-full px-2.5 text-xs text-slate-700 bg-transparent border-0 outline-none cursor-pointer hover:bg-slate-50 focus:bg-blue-50"
        style={{ colorScheme: 'light', minWidth: 0 }}
      />
    );
  }

  // ── Link ──────────────────────────────────────────────────────────────────
  if (column.type === 'link') {
    if (editing) {
      return (
        <input
          ref={inputRef}
          data-cell={cellKey}
          tabIndex={0}
          type="url"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={() => commit()}
          onKeyDown={handleKeyDown}
          placeholder="https://..."
          className="w-full h-full px-2.5 text-xs text-blue-600 bg-blue-50 outline-none ring-1 ring-inset ring-blue-300"
        />
      );
    }
    return (
      <div
        data-cell={cellKey}
        tabIndex={0}
        onClick={() => setEditing(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'F2') { setEditing(true); return; } viewKeyDown(e); }}
        className="w-full h-full flex items-center gap-1.5 px-2.5 hover:bg-slate-50 cursor-text focus:outline-none focus:bg-blue-50 group/link"
      >
        {value ? (
          <>
            <span className="text-blue-600 text-xs truncate underline flex-1">{value}</span>
            <a href={value} target="_blank" rel="noopener noreferrer"
              onClick={e => e.stopPropagation()} tabIndex={-1}
              className="opacity-0 group-hover/link:opacity-100 text-slate-400 hover:text-blue-600 flex-shrink-0">
              <ExternalLink size={11} />
            </a>
          </>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </div>
    );
  }

  // ── Text / Number ─────────────────────────────────────────────────────────
  if (editing) {
    return (
      <input
        ref={inputRef}
        data-cell={cellKey}
        tabIndex={0}
        type={column.type === 'number' ? 'number' : 'text'}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={() => commit()}
        onKeyDown={handleKeyDown}
        className="w-full h-full px-2.5 text-xs text-slate-700 bg-blue-50 outline-none ring-1 ring-inset ring-blue-300"
      />
    );
  }

  return (
    <div
      data-cell={cellKey}
      tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={viewKeyDown}
      className="w-full h-full flex items-center px-2.5 hover:bg-slate-50 cursor-text focus:outline-none focus:bg-blue-50"
    >
      {value ? (
        <span className={`text-xs text-slate-700 truncate ${column.type === 'number' ? 'tabular-nums' : ''}`}>
          {column.type === 'number' ? Number(value).toLocaleString() : value}
        </span>
      ) : (
        <span className="text-slate-300 text-xs">—</span>
      )}
    </div>
  );
});
