import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { ExternalLink } from 'lucide-react';
import type { Column } from '../../types/proposals';
import { OPTION_COLOR_STYLES } from '../../types/proposals';

interface TableCellProps {
  column: Column;
  value: string;
  rowId: string;
  colIndex: number;
  rowIndex: number;
  totalCols: number;
  totalRows: number;
  cellKey: string;           // e.g. "2-4" used as data-cell for focus targeting
  onChange: (value: string) => void;
  onNavigate: (rowDelta: number, colDelta: number) => void;
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────
const DropdownCell = memo(({ column, value, onChange, cellKey }: {
  column: Column; value: string; onChange: (v: string) => void; cellKey: string;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = column.options ?? [];
  const selected = options.find(o => o.id === value);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  return (
    <div ref={ref} className="relative w-full h-full">
      <button
        data-cell={cellKey}
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); }
          if (e.key === 'Escape') setOpen(false);
        }}
        className="w-full h-full flex items-center px-2.5 hover:bg-slate-50 transition-colors focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-inset focus:ring-blue-200"
      >
        {selected
          ? <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${OPTION_COLOR_STYLES[selected.color]}`}>{selected.label}</span>
          : <span className="text-slate-300 text-xs">—</span>
        }
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-0.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl min-w-40 py-1"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          <button onClick={() => { onChange(''); setOpen(false); }}
            className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-50">— Clear</button>
          {options.map(opt => (
            <button key={opt.id} onClick={() => { onChange(opt.id); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${OPTION_COLOR_STYLES[opt.color]}`}>{opt.label}</span>
              {value === opt.id && <span className="ml-auto text-blue-500 text-xs">✓</span>}
            </button>
          ))}
          {options.length === 0 && <p className="px-3 py-2 text-xs text-slate-400">No options defined</p>}
        </div>
      )}
    </div>
  );
});

// ─── Main cell ────────────────────────────────────────────────────────────────
export const TableCell = memo(({ column, value, cellKey, onChange, onNavigate }: TableCellProps) => {
  const [draft, setDraft]     = useState(value);
  const [editing, setEditing] = useState(false);
  const inputRef              = useRef<HTMLInputElement>(null);
  const didCommit             = useRef(false);

  // Sync realtime value changes while NOT editing
  useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);

  // Focus & select on enter edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = useCallback((nav?: () => void) => {
    if (didCommit.current) return;
    didCommit.current = true;
    setEditing(false);
    if (draft !== value) onChange(draft);
    requestAnimationFrame(() => {
      didCommit.current = false;
      nav?.();
    });
  }, [draft, value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setDraft(value);
        setEditing(false);
        break;
      case 'Enter':
        if (!e.shiftKey) { e.preventDefault(); commit(() => onNavigate(1, 0)); }
        break;
      case 'Tab':
        e.preventDefault();
        commit(() => onNavigate(0, e.shiftKey ? -1 : 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        commit(() => onNavigate(-1, 0));
        break;
      case 'ArrowDown':
        e.preventDefault();
        commit(() => onNavigate(1, 0));
        break;
    }
  }, [commit, onNavigate, value]);

  const viewKeyDown = useCallback((e: React.KeyboardEvent<HTMLElement>) => {
    switch (e.key) {
      case 'Enter': case 'F2':
        e.preventDefault(); setEditing(true); break;
      case 'Tab':
        e.preventDefault(); onNavigate(0, e.shiftKey ? -1 : 1); break;
      case 'ArrowUp':
        e.preventDefault(); onNavigate(-1, 0); break;
      case 'ArrowDown':
        e.preventDefault(); onNavigate(1, 0); break;
      case 'ArrowLeft': case 'ArrowRight': break;
      default:
        // Start typing to enter edit immediately
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          setDraft('');
          setEditing(true);
        }
    }
  }, [onNavigate]);

  // ── Date ──────────────────────────────────────────────────────────────────
  if (column.type === 'date') {
    return (
      <input
        data-cell={cellKey}
        tabIndex={0}
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Tab')   { e.preventDefault(); onNavigate(0, e.shiftKey ? -1 : 1); }
          if (e.key === 'Enter') { e.preventDefault(); onNavigate(1, 0); }
          if (e.key === 'ArrowUp')   { e.preventDefault(); onNavigate(-1, 0); }
          if (e.key === 'ArrowDown') { e.preventDefault(); onNavigate(1, 0); }
        }}
        className="w-full h-full px-2.5 text-xs text-slate-700 bg-transparent outline-none hover:bg-slate-50 focus:bg-blue-50 focus:ring-1 focus:ring-inset focus:ring-blue-200 transition-colors cursor-pointer"
      />
    );
  }

  // ── Dropdown ──────────────────────────────────────────────────────────────
  if (column.type === 'dropdown') {
    return <DropdownCell column={column} value={value} onChange={onChange} cellKey={cellKey} />;
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
      <div data-cell={cellKey} tabIndex={0}
        onClick={() => setEditing(true)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); setEditing(true); return; }
          viewKeyDown(e);
        }}
        className="w-full h-full flex items-center gap-1.5 px-2.5 hover:bg-slate-50 cursor-text group/link focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-inset focus:ring-blue-200"
      >
        {value ? (
          <>
            <span className="text-blue-600 text-xs truncate underline underline-offset-2 flex-1">{value}</span>
            <a href={value} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} tabIndex={-1}
              className="opacity-0 group-hover/link:opacity-100 text-slate-400 hover:text-blue-600 flex-shrink-0">
              <ExternalLink size={11} />
            </a>
          </>
        ) : <span className="text-slate-300 text-xs">—</span>}
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
    <div data-cell={cellKey} tabIndex={0}
      onClick={() => setEditing(true)}
      onKeyDown={viewKeyDown}
      className="w-full h-full flex items-center px-2.5 hover:bg-slate-50 cursor-text transition-colors focus:outline-none focus:bg-blue-50 focus:ring-1 focus:ring-inset focus:ring-blue-200"
    >
      {value
        ? <span className={`text-xs text-slate-700 truncate ${column.type === 'number' ? 'tabular-nums' : ''}`}>
            {column.type === 'number' ? Number(value).toLocaleString() : value}
          </span>
        : <span className="text-slate-300 text-xs">—</span>
      }
    </div>
  );
});
