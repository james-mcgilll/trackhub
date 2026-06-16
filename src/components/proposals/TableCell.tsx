import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import type { Column } from '../../types/proposals';
import { OPTION_COLOR_STYLES } from '../../types/proposals';

interface TableCellProps {
  column: Column;
  value: string;
  onChange: (value: string) => void;
}

export const TableCell: React.FC<TableCellProps> = ({ column, value, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync external value changes
  useEffect(() => { setDraft(value); }, [value]);

  // Focus input when editing starts
  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [dropdownOpen]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { setDraft(value); setEditing(false); }
  };

  // ── Dropdown type ──────────────────────────────────────────────────────
  if (column.type === 'dropdown') {
    const options = column.options ?? [];
    const selected = options.find(o => o.id === value);
    return (
      <div className="relative w-full h-full" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full h-full flex items-center px-2.5 py-1.5 hover:bg-slate-50 transition-colors"
        >
          {selected ? (
            <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${OPTION_COLOR_STYLES[selected.color]}`}>
              {selected.label}
            </span>
          ) : (
            <span className="text-slate-300 text-xs">—</span>
          )}
        </button>
        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-0.5 z-40 bg-white border border-slate-200 rounded-xl shadow-lg min-w-36 py-1"
            style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
          >
            <button
              onClick={() => { onChange(''); setDropdownOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-50"
            >
              — Clear
            </button>
            {options.map(opt => (
              <button
                key={opt.id}
                onClick={() => { onChange(opt.id); setDropdownOpen(false); }}
                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${OPTION_COLOR_STYLES[opt.color]}`}>
                  {opt.label}
                </span>
                {value === opt.id && <span className="ml-auto text-blue-500 text-xs">✓</span>}
              </button>
            ))}
            {options.length === 0 && (
              <p className="px-3 py-2 text-xs text-slate-400">No options defined</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Date type ──────────────────────────────────────────────────────────
  if (column.type === 'date') {
    return (
      <input
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full h-full px-2.5 py-1.5 text-xs text-slate-700 bg-transparent outline-none hover:bg-slate-50 focus:bg-blue-50 focus:ring-1 focus:ring-blue-300 transition-colors cursor-pointer"
      />
    );
  }

  // ── Link type ──────────────────────────────────────────────────────────
  if (column.type === 'link') {
    if (editing) {
      return (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="url"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          placeholder="https://..."
          className="w-full h-full px-2.5 py-1.5 text-xs text-blue-600 bg-blue-50 outline-none ring-1 ring-blue-300"
        />
      );
    }
    return (
      <div
        className="w-full h-full flex items-center gap-1.5 px-2.5 py-1.5 hover:bg-slate-50 cursor-text group/link"
        onClick={() => setEditing(true)}
      >
        {value ? (
          <>
            <span className="text-blue-600 text-xs truncate underline underline-offset-2 flex-1">{value}</span>
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="opacity-0 group-hover/link:opacity-100 text-slate-400 hover:text-blue-600 transition-opacity flex-shrink-0"
            >
              <ExternalLink size={11} />
            </a>
          </>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )}
      </div>
    );
  }

  // ── Text / Number type ────────────────────────────────────────────────
  if (editing) {
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={column.type === 'number' ? 'number' : 'text'}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-full h-full px-2.5 py-1.5 text-xs text-slate-700 bg-blue-50 outline-none ring-1 ring-blue-300"
      />
    );
  }

  return (
    <div
      className="w-full h-full flex items-center px-2.5 py-1.5 hover:bg-slate-50 cursor-text transition-colors"
      onClick={() => setEditing(true)}
    >
      {value ? (
        <span className={`text-xs text-slate-700 truncate ${column.type === 'number' ? 'tabular-nums' : ''}`}>
          {column.type === 'number' && value
            ? Number(value).toLocaleString()
            : value}
        </span>
      ) : (
        <span className="text-slate-300 text-xs">—</span>
      )}
    </div>
  );
};
