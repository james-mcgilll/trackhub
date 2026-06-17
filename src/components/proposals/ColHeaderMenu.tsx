import React, { useState, useRef, useEffect } from 'react';
import {
  Settings2, Trash2, ChevronLeft, ChevronRight,
  Type, Hash, Calendar, Link2, List, Check, X, Plus,
  Copy, Pencil, GripVertical,
} from 'lucide-react';
import type { Column, ColumnType } from '../../types/proposals';
import { OPTION_COLORS, OPTION_COLOR_STYLES } from '../../types/proposals';

const TYPE_META: Record<ColumnType, { icon: React.ReactNode; label: string; desc: string }> = {
  text:     { icon: <Type size={13} />,     label: 'Free Text',  desc: 'Any text value'   },
  number:   { icon: <Hash size={13} />,     label: 'Number',     desc: 'Numeric values'   },
  date:     { icon: <Calendar size={13} />, label: 'Date',       desc: 'Date picker'      },
  link:     { icon: <Link2 size={13} />,    label: 'Link / URL', desc: 'Clickable URL'    },
  dropdown: { icon: <List size={13} />,     label: 'Dropdown',   desc: 'Select from list' },
};

interface ColHeaderMenuProps {
  column: Column;
  isFirst: boolean;
  isLast: boolean;
  onRename: (name: string) => void;
  onChangeType: (type: ColumnType) => void;
  onDelete: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onAddOption: (label: string, color: string) => void;
  onUpdateOption: (optId: string, label: string, color: string) => void;
  onDeleteOption: (optId: string) => void;
  onDuplicate?: () => void;
  onSetWidth?: (width: number) => void;
}

type Tab = 'settings' | 'type' | 'options';

export const ColHeaderMenu: React.FC<ColHeaderMenuProps> = ({
  column, isFirst, isLast,
  onRename, onChangeType, onDelete, onMoveLeft, onMoveRight,
  onAddOption, onUpdateOption, onDeleteOption,
  onDuplicate, onSetWidth,
}) => {
  const [open, setOpen]             = useState(false);
  const [tab, setTab]               = useState<Tab>('settings');
  const [nameVal, setNameVal]       = useState(column.name);
  const [widthVal, setWidthVal]     = useState(String(column.width));
  const [newOptLabel, setNewOptLabel] = useState('');
  const [newOptColor, setNewOptColor] = useState('blue');
  const [editOptId, setEditOptId]   = useState<string | null>(null);
  const [editLabel, setEditLabel]   = useState('');
  const [editColor, setEditColor]   = useState('blue');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Keep name in sync with external changes
  useEffect(() => { if (!open) setNameVal(column.name); }, [column.name, open]);
  useEffect(() => { if (!open) setWidthVal(String(column.width)); }, [column.width, open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setDeleteConfirm(false);
      }
    };
    // Small delay so the open click doesn't immediately close
    const t = setTimeout(() => document.addEventListener('mousedown', handle), 150);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handle); };
  }, [open]);

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setNameVal(column.name);
    setWidthVal(String(column.width));
    setTab('settings');
    setDeleteConfirm(false);
    setEditOptId(null);
    setNewOptLabel('');
    setOpen(true);
  };

  const close = () => { setOpen(false); setDeleteConfirm(false); };

  const saveName = () => {
    const v = nameVal.trim();
    if (v && v !== column.name) onRename(v);
  };

  const saveWidth = () => {
    const w = parseInt(widthVal, 10);
    if (!isNaN(w) && w >= 60 && w <= 800) onSetWidth?.(w);
    else setWidthVal(String(column.width));
  };

  const handleAddOpt = () => {
    if (!newOptLabel.trim()) return;
    onAddOption(newOptLabel.trim(), newOptColor);
    setNewOptLabel('');
  };

  const handleDeleteCol = () => {
    if (deleteConfirm) { onDelete(); close(); }
    else { setDeleteConfirm(true); setTimeout(() => setDeleteConfirm(false), 3000); }
  };

  return (
    <div ref={wrapperRef} className="relative flex-shrink-0">
      {/* Always-visible gear icon button */}
      <button
        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
        onClick={openMenu}
        className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
        title="Column settings"
      >
        <Settings2 size={13} />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1 bg-white border border-slate-200 rounded-2xl z-[999]"
          style={{ width: 284, boxShadow: '0 16px 40px rgba(0,0,0,0.18)' }}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-slate-400">{TYPE_META[column.type].icon}</span>
              <span className="text-sm font-semibold text-slate-700 truncate">{column.name}</span>
            </div>
            <button onClick={close} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
              <X size={14} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-2">
            {(['settings', 'type', ...(column.type === 'dropdown' ? ['options'] : [])] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                  tab === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* ── SETTINGS ── */}
          {tab === 'settings' && (
            <div className="px-4 pb-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Column Name</label>
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={nameVal}
                    onChange={e => setNameVal(e.target.value)}
                    onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') saveName(); }}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                    placeholder="Column name"
                  />
                  <button
                    onClick={saveName}
                    className="px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Width */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Width (px)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={60} max={800}
                    value={widthVal}
                    onChange={e => setWidthVal(e.target.value)}
                    onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') saveWidth(); }}
                    onBlur={saveWidth}
                    className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 tabular-nums"
                  />
                  {[120, 180, 240, 320].map(w => (
                    <button
                      key={w}
                      onClick={() => { onSetWidth?.(w); setWidthVal(String(w)); }}
                      className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${
                        column.width === w
                          ? 'border-blue-400 bg-blue-50 text-blue-600 font-semibold'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Type shortcut */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Column Type</label>
                <button
                  onClick={() => setTab('type')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left"
                >
                  <span className="text-blue-600">{TYPE_META[column.type].icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{TYPE_META[column.type].label}</p>
                    <p className="text-xs text-slate-400">{TYPE_META[column.type].desc}</p>
                  </div>
                  <span className="text-xs text-blue-500">Change →</span>
                </button>
              </div>

              {/* Dropdown options shortcut */}
              {column.type === 'dropdown' && (
                <button
                  onClick={() => setTab('options')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left"
                >
                  <List size={14} className="text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">Dropdown Options</p>
                    <p className="text-xs text-slate-400">{(column.options ?? []).length} options configured</p>
                  </div>
                  <span className="text-xs text-blue-500">Manage →</span>
                </button>
              )}

              {/* Move */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Position</label>
                <div className="flex gap-2">
                  <button onClick={onMoveLeft} disabled={isFirst}
                    className="flex-1 flex items-center justify-center gap-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={14} /> Move Left
                  </button>
                  <button onClick={onMoveRight} disabled={isLast}
                    className="flex-1 flex items-center justify-center gap-1 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    Move Right <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-1 pt-1 border-t border-slate-100">
                {onDuplicate && (
                  <button onClick={() => { onDuplicate(); close(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl">
                    <Copy size={13} className="text-slate-400" /> Duplicate column
                  </button>
                )}
                <button onClick={handleDeleteCol}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-xl font-medium transition-all ${
                    deleteConfirm ? 'bg-red-500 text-white' : 'text-red-500 hover:bg-red-50'
                  }`}>
                  <Trash2 size={13} className={deleteConfirm ? 'text-white' : 'text-red-400'} />
                  {deleteConfirm ? 'Click again to confirm delete' : 'Delete column'}
                </button>
              </div>
            </div>
          )}

          {/* ── TYPE ── */}
          {tab === 'type' && (
            <div className="p-3 space-y-1 pb-4">
              <p className="text-xs text-slate-400 px-1 pb-1">Select a column type</p>
              {(Object.entries(TYPE_META) as [ColumnType, typeof TYPE_META[ColumnType]][]).map(([type, meta]) => (
                <button key={type}
                  onClick={() => { onChangeType(type); setTab(type === 'dropdown' ? 'options' : 'settings'); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all ${
                    column.type === type ? 'bg-blue-50 border-blue-200' : 'border-transparent hover:bg-slate-50'
                  }`}>
                  <span className={column.type === type ? 'text-blue-600' : 'text-slate-400'}>{meta.icon}</span>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-medium ${column.type === type ? 'text-blue-700' : 'text-slate-700'}`}>{meta.label}</p>
                    <p className="text-xs text-slate-400">{meta.desc}</p>
                  </div>
                  {column.type === type && <Check size={14} className="text-blue-600" />}
                </button>
              ))}
            </div>
          )}

          {/* ── OPTIONS ── */}
          {tab === 'options' && (
            <div className="px-4 pb-4">
              <div className="space-y-1.5 max-h-48 overflow-y-auto mb-3">
                {(column.options ?? []).length === 0 && (
                  <div className="text-center py-6">
                    <List size={22} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400">No options yet — add one below</p>
                  </div>
                )}
                {(column.options ?? []).map(opt => (
                  <div key={opt.id}>
                    {editOptId === opt.id ? (
                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-2.5 py-2">
                        <ColorDot selected={editColor} onChange={setEditColor} />
                        <input autoFocus value={editLabel} onChange={e => setEditLabel(e.target.value)}
                          onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') { onUpdateOption(opt.id, editLabel.trim(), editColor); setEditOptId(null); } if (e.key === 'Escape') setEditOptId(null); }}
                          className="flex-1 bg-transparent text-xs outline-none text-slate-700 font-medium min-w-0" />
                        <button onClick={() => { if (editLabel.trim()) { onUpdateOption(opt.id, editLabel.trim(), editColor); } setEditOptId(null); }}
                          className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-lg"><Check size={12} /></button>
                        <button onClick={() => setEditOptId(null)}
                          className="p-1 text-slate-400 hover:bg-slate-200 rounded-lg"><X size={12} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-1.5 py-1 rounded-xl group/opt hover:bg-slate-50">
                        <GripVertical size={11} className="text-slate-300 flex-shrink-0" />
                        <span className={`flex-1 text-xs px-2 py-1 rounded-lg font-medium truncate ${OPTION_COLOR_STYLES[opt.color] ?? 'bg-slate-100 text-slate-600'}`}>
                          {opt.label}
                        </span>
                        <button onClick={() => { setEditOptId(opt.id); setEditLabel(opt.label); setEditColor(opt.color); }}
                          className="opacity-0 group-hover/opt:opacity-100 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-all">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => onDeleteOption(opt.id)}
                          className="opacity-0 group-hover/opt:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add New Option</p>
                <div className="flex items-center gap-2">
                  <ColorDot selected={newOptColor} onChange={setNewOptColor} />
                  <input value={newOptLabel} onChange={e => setNewOptLabel(e.target.value)}
                    onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') handleAddOpt(); }}
                    placeholder="Option name..."
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 min-w-0"
                  />
                  <button onClick={handleAddOpt} disabled={!newOptLabel.trim()}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Color picker ──────────────────────────────────────────────────────────────
const ColorDot: React.FC<{ selected: string; onChange: (c: string) => void }> = ({ selected, onChange }) => {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShow(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [show]);

  const selBg = (OPTION_COLOR_STYLES[selected] ?? 'bg-slate-100').split(' ')[0];

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={e => { e.stopPropagation(); setShow(s => !s); }}
        className={`w-6 h-6 rounded-full ${selBg} flex-shrink-0 hover:scale-110 transition-transform`}
        style={{ boxShadow: '0 0 0 2px white, 0 0 0 3.5px rgba(0,0,0,0.15)' }}
      />
      {show && (
        <div className="absolute bottom-full mb-2 left-0 bg-white border border-slate-200 rounded-xl p-2 shadow-xl z-[9999] flex flex-wrap gap-1.5"
          style={{ width: 120 }}
          onMouseDown={e => e.stopPropagation()}
        >
          {OPTION_COLORS.map(c => {
            const bg = (OPTION_COLOR_STYLES[c.value] ?? 'bg-slate-100').split(' ')[0];
            return (
              <button key={c.value} title={c.label}
                onClick={e => { e.stopPropagation(); onChange(c.value); setShow(false); }}
                className={`w-6 h-6 rounded-full ${bg} hover:scale-110 transition-all border-2 ${selected === c.value ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
