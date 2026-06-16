import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight,
  Type, Hash, Calendar, Link2, List, Check, X, Plus,
  GripVertical, Copy,
} from 'lucide-react';
import type { Column, ColumnType, DropdownOption } from '../../types/proposals';
import { OPTION_COLORS, OPTION_COLOR_STYLES } from '../../types/proposals';

const TYPE_META: Record<ColumnType, { icon: React.ReactNode; label: string; desc: string }> = {
  text:     { icon: <Type size={14} />,     label: 'Free Text',  desc: 'Any text value'    },
  number:   { icon: <Hash size={14} />,     label: 'Number',     desc: 'Numeric values'    },
  date:     { icon: <Calendar size={14} />, label: 'Date',       desc: 'Date picker'       },
  link:     { icon: <Link2 size={14} />,    label: 'Link / URL', desc: 'Clickable URL'     },
  dropdown: { icon: <List size={14} />,     label: 'Dropdown',   desc: 'Select from list'  },
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

export const ColHeaderMenu: React.FC<ColHeaderMenuProps> = ({
  column, isFirst, isLast,
  onRename, onChangeType, onDelete, onMoveLeft, onMoveRight,
  onAddOption, onUpdateOption, onDeleteOption,
  onDuplicate, onSetWidth,
}) => {
  const [open, setOpen]         = useState(false);
  const [tab, setTab]           = useState<'settings' | 'type' | 'options'>('settings');
  const [nameVal, setNameVal]   = useState(column.name);
  const [widthVal, setWidthVal] = useState(String(column.width));
  const [newOptLabel, setNewOptLabel] = useState('');
  const [newOptColor, setNewOptColor] = useState('blue');
  const [editOptId, setEditOptId]     = useState<string | null>(null);
  const [editLabel, setEditLabel]     = useState('');
  const [editColor, setEditColor]     = useState('blue');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const nameRef  = useRef<HTMLInputElement>(null);

  // Sync when column changes externally
  useEffect(() => { setNameVal(column.name); }, [column.name]);
  useEffect(() => { setWidthVal(String(column.width)); }, [column.width]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        setTab('settings');
        setDeleteConfirm(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const openPanel = () => {
    setNameVal(column.name);
    setWidthVal(String(column.width));
    setTab('settings');
    setDeleteConfirm(false);
    setOpen(true);
    setTimeout(() => nameRef.current?.select(), 50);
  };

  const saveName = useCallback(() => {
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== column.name) onRename(trimmed);
  }, [nameVal, column.name, onRename]);

  const saveWidth = useCallback(() => {
    const w = parseInt(widthVal, 10);
    if (!isNaN(w) && w >= 60 && w <= 800) onSetWidth?.(w);
    else setWidthVal(String(column.width));
  }, [widthVal, column.width, onSetWidth]);

  const handleAddOpt = () => {
    if (!newOptLabel.trim()) return;
    onAddOption(newOptLabel.trim(), newOptColor);
    setNewOptLabel('');
    setNewOptColor('blue');
  };

  const startEditOpt = (opt: DropdownOption) => {
    setEditOptId(opt.id);
    setEditLabel(opt.label);
    setEditColor(opt.color);
  };

  const saveEditOpt = (optId: string) => {
    if (editLabel.trim()) { onUpdateOption(optId, editLabel.trim(), editColor); }
    setEditOptId(null);
  };

  const handleDelete = () => {
    if (deleteConfirm) { onDelete(); setOpen(false); }
    else { setDeleteConfirm(true); setTimeout(() => setDeleteConfirm(false), 3000); }
  };

  const curTypeMeta = TYPE_META[column.type];

  return (
    <div className="relative flex-shrink-0" ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={openPanel}
        className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
        title="Column settings"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl"
          style={{ width: 280, boxShadow: '0 16px 40px rgba(0,0,0,0.14)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">{curTypeMeta.icon}</span>
              <span className="text-sm font-semibold text-slate-700 truncate max-w-36">{column.name}</span>
            </div>
            <button onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 px-3 pt-3">
            {([
              { id: 'settings', label: 'Settings' },
              { id: 'type',     label: 'Type'     },
              ...(column.type === 'dropdown' ? [{ id: 'options', label: 'Options' }] : []),
            ] as { id: typeof tab; label: string }[]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
                  tab === t.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}>
                {t.label}
              </button>
            ))}
          </div>

          {/* ── Settings tab ── */}
          {tab === 'settings' && (
            <div className="p-4 space-y-4">
              {/* Column name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Column Name</label>
                <div className="flex gap-2">
                  <input
                    ref={nameRef}
                    value={nameVal}
                    onChange={e => setNameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { saveName(); } if (e.key === 'Escape') setNameVal(column.name); }}
                    onBlur={saveName}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                    placeholder="Column name"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1">Press Enter or click away to save</p>
              </div>

              {/* Column width */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Width (px)</label>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min={60} max={800}
                    value={widthVal}
                    onChange={e => setWidthVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveWidth(); }}
                    onBlur={saveWidth}
                    className="w-24 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all tabular-nums"
                  />
                  {/* Quick size presets */}
                  <div className="flex gap-1">
                    {[120, 180, 240].map(w => (
                      <button key={w} onClick={() => { onSetWidth?.(w); setWidthVal(String(w)); }}
                        className={`text-xs px-2 py-1.5 rounded-lg border transition-colors ${
                          column.width === w
                            ? 'border-blue-400 bg-blue-50 text-blue-600 font-medium'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}>
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Current type display */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Column Type</label>
                <button onClick={() => setTab('type')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all group">
                  <span className="text-blue-600">{curTypeMeta.icon}</span>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-slate-700">{curTypeMeta.label}</p>
                    <p className="text-xs text-slate-400">{curTypeMeta.desc}</p>
                  </div>
                  <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">Change →</span>
                </button>
              </div>

              {/* Move controls */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Position</label>
                <div className="flex gap-2">
                  <button onClick={() => { onMoveLeft(); }} disabled={isFirst}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft size={14} /> Move Left
                  </button>
                  <button onClick={() => { onMoveRight(); }} disabled={isLast}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    Move Right <ChevronRight size={14} />
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Or drag the column header to reorder</p>
              </div>

              {/* Danger zone */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                {onDuplicate && (
                  <button onClick={() => { onDuplicate(); setOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                    <Copy size={13} className="text-slate-400" /> Duplicate column
                  </button>
                )}
                <button onClick={handleDelete}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-all ${
                    deleteConfirm
                      ? 'bg-red-500 text-white font-medium'
                      : 'text-red-500 hover:bg-red-50'
                  }`}>
                  <Trash2 size={13} className={deleteConfirm ? 'text-white' : 'text-red-400'} />
                  {deleteConfirm ? 'Click again to confirm delete' : 'Delete column'}
                </button>
              </div>
            </div>
          )}

          {/* ── Type tab ── */}
          {tab === 'type' && (
            <div className="p-3 space-y-1">
              <p className="text-xs text-slate-400 px-1 pb-1">Select a type for this column</p>
              {(Object.entries(TYPE_META) as [ColumnType, typeof TYPE_META[ColumnType]][]).map(([type, meta]) => (
                <button key={type}
                  onClick={() => { onChangeType(type); setTab('settings'); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    column.type === type
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-slate-50 border border-transparent'
                  }`}>
                  <span className={column.type === type ? 'text-blue-600' : 'text-slate-400'}>{meta.icon}</span>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-medium ${column.type === type ? 'text-blue-700' : 'text-slate-700'}`}>{meta.label}</p>
                    <p className="text-xs text-slate-400">{meta.desc}</p>
                  </div>
                  {column.type === type && <Check size={14} className="text-blue-600 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* ── Options tab (dropdown only) ── */}
          {tab === 'options' && (
            <div className="p-4">
              <p className="text-xs text-slate-400 mb-3">
                {(column.options ?? []).length} option{(column.options ?? []).length !== 1 ? 's' : ''}
              </p>

              {/* Options list */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto mb-3 pr-0.5">
                {(column.options ?? []).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No options yet. Add one below.</p>
                )}
                {(column.options ?? []).map(opt => (
                  <div key={opt.id}>
                    {editOptId === opt.id ? (
                      <div className="flex items-center gap-1.5 bg-blue-50 rounded-xl px-2 py-1.5">
                        <input autoFocus value={editLabel} onChange={e => setEditLabel(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveEditOpt(opt.id); if (e.key === 'Escape') setEditOptId(null); }}
                          className="flex-1 text-xs bg-transparent outline-none text-slate-700 font-medium" />
                        <ColorDot selected={editColor} onChange={setEditColor} />
                        <button onClick={() => saveEditOpt(opt.id)} className="p-1 text-emerald-600 hover:bg-emerald-100 rounded-lg"><Check size={12} /></button>
                        <button onClick={() => setEditOptId(null)} className="p-1 text-slate-400 hover:bg-slate-200 rounded-lg"><X size={12} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-1 py-0.5 rounded-xl group/opt hover:bg-slate-50">
                        <GripVertical size={12} className="text-slate-300 flex-shrink-0" />
                        <span className={`flex-1 text-xs px-2 py-1 rounded-lg font-medium truncate ${OPTION_COLOR_STYLES[opt.color]}`}>
                          {opt.label}
                        </span>
                        <button onClick={() => startEditOpt(opt)}
                          className="opacity-0 group-hover/opt:opacity-100 p-1 text-slate-400 hover:text-slate-700 rounded-lg transition-all">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => onDeleteOption(opt.id)}
                          className="opacity-0 group-hover/opt:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded-lg transition-all">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add new option */}
              <div className="border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2">
                  <ColorDot selected={newOptColor} onChange={setNewOptColor} />
                  <input value={newOptLabel} onChange={e => setNewOptLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddOpt()}
                    placeholder="Add option..."
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                  />
                  <button onClick={handleAddOpt} disabled={!newOptLabel.trim()}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0">
                    <Plus size={13} />
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

// ─── Color picker dot ─────────────────────────────────────────────────────────
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
    <div className="relative flex-shrink-0" ref={ref}>
      <button onClick={() => setShow(s => !s)}
        className={`w-6 h-6 rounded-full ${selBg} border-2 border-white shadow flex-shrink-0`}
        style={{ boxShadow: '0 0 0 1.5px rgba(0,0,0,0.1)' }}
        title="Pick color"
      />
      {show && (
        <div className="absolute bottom-full mb-2 left-0 bg-white border border-slate-200 rounded-xl p-2 shadow-xl z-50 flex flex-wrap gap-1.5" style={{ width: 116 }}>
          {OPTION_COLORS.map(c => {
            const bg = (OPTION_COLOR_STYLES[c.value] ?? 'bg-slate-100').split(' ')[0];
            const isSelected = selected === c.value;
            return (
              <button key={c.value} title={c.label}
                onClick={() => { onChange(c.value); setShow(false); }}
                className={`w-6 h-6 rounded-full ${bg} transition-all hover:scale-110 border-2 ${isSelected ? 'border-slate-700 scale-110' : 'border-transparent'}`}
                style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
