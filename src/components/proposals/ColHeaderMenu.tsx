import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight,
  Type, Hash, Calendar, Link2, List, Check, X, Plus,
  GripVertical, Copy,
} from 'lucide-react';
import type { Column, ColumnType, DropdownOption } from '../../types/proposals';
import { OPTION_COLORS, OPTION_COLOR_STYLES } from '../../types/proposals';

// ─── Type metadata ────────────────────────────────────────────────────────────
const TYPE_META: Record<ColumnType, { icon: React.ReactNode; label: string; desc: string }> = {
  text:     { icon: <Type size={14} />,     label: 'Free Text',  desc: 'Any text value'   },
  number:   { icon: <Hash size={14} />,     label: 'Number',     desc: 'Numeric values'   },
  date:     { icon: <Calendar size={14} />, label: 'Date',       desc: 'Date picker'      },
  link:     { icon: <Link2 size={14} />,    label: 'Link / URL', desc: 'Clickable URL'    },
  dropdown: { icon: <List size={14} />,     label: 'Dropdown',   desc: 'Select from list' },
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
  const [open, setOpen]               = useState(false);
  const [tab, setTab]                 = useState<Tab>('settings');
  // Use a ref for the name so we never have stale closure issues
  const nameRef                       = useRef(column.name);
  const [nameVal, setNameValState]    = useState(column.name);
  const [widthVal, setWidthVal]       = useState(String(column.width));
  const [newOptLabel, setNewOptLabel] = useState('');
  const [newOptColor, setNewOptColor] = useState('blue');
  const [editOptId, setEditOptId]     = useState<string | null>(null);
  const [editLabel, setEditLabel]     = useState('');
  const [editColor, setEditColor]     = useState('blue');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const panelRef     = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const nameChanged  = useRef(false);

  const setNameVal = (v: string) => {
    nameRef.current = v;
    setNameValState(v);
    nameChanged.current = true;
  };

  // Sync when column name changes externally (realtime)
  useEffect(() => {
    if (!nameChanged.current) {
      setNameValState(column.name);
      nameRef.current = column.name;
    }
  }, [column.name]);

  useEffect(() => {
    setWidthVal(String(column.width));
  }, [column.width]);

  // Close on outside click — but ONLY if click is truly outside the whole panel
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closePanel();
      }
    };
    // Use timeout so clicks inside the panel don't immediately close it
    const t = setTimeout(() => document.addEventListener('mousedown', h), 100);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', h);
    };
  }, [open]);

  const openPanel = () => {
    nameRef.current = column.name;
    setNameValState(column.name);
    setWidthVal(String(column.width));
    setTab('settings');
    setDeleteConfirm(false);
    nameChanged.current = false;
    setOpen(true);
    // Auto-focus & select the name input
    setTimeout(() => {
      nameInputRef.current?.focus();
      nameInputRef.current?.select();
    }, 80);
  };

  const closePanel = () => {
    // Save name if changed before closing
    const trimmed = nameRef.current.trim();
    if (nameChanged.current && trimmed && trimmed !== column.name) {
      onRename(trimmed);
    }
    nameChanged.current = false;
    setOpen(false);
    setDeleteConfirm(false);
    setEditOptId(null);
  };

  // Save name — called by button click OR Enter key
  const saveName = useCallback(() => {
    const trimmed = nameRef.current.trim();
    if (trimmed && trimmed !== column.name) {
      onRename(trimmed);
      nameChanged.current = false;
    }
  }, [column.name, onRename]);

  const saveWidth = useCallback(() => {
    const w = parseInt(widthVal, 10);
    if (!isNaN(w) && w >= 60 && w <= 800) onSetWidth?.(w);
    else setWidthVal(String(column.width));
  }, [widthVal, column.width, onSetWidth]);

  const handleAddOpt = () => {
    if (!newOptLabel.trim()) return;
    onAddOption(newOptLabel.trim(), newOptColor);
    setNewOptLabel('');
  };

  const startEditOpt = (opt: DropdownOption) => {
    setEditOptId(opt.id);
    setEditLabel(opt.label);
    setEditColor(opt.color);
  };

  const saveEditOpt = (optId: string) => {
    if (editLabel.trim()) onUpdateOption(optId, editLabel.trim(), editColor);
    setEditOptId(null);
  };

  const handleDelete = () => {
    if (deleteConfirm) { onDelete(); setOpen(false); }
    else {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 3000);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'settings', label: 'Settings' },
    { id: 'type',     label: 'Type'     },
    ...(column.type === 'dropdown' ? [{ id: 'options' as Tab, label: 'Options' }] : []),
  ];

  const curType = TYPE_META[column.type];

  return (
    <div className="relative flex-shrink-0" ref={panelRef}>
      {/* ⋯ trigger */}
      <button
        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); }}
        onClick={e => { e.stopPropagation(); open ? closePanel() : openPanel(); }}
        className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
        title="Column settings"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1 z-[100] bg-white border border-slate-200 rounded-2xl"
          style={{ width: 288, boxShadow: '0 20px 48px rgba(0,0,0,0.16), 0 0 0 1px rgba(0,0,0,0.06)' }}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3.5 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-slate-400 flex-shrink-0">{curType.icon}</span>
              <span className="text-sm font-semibold text-slate-700 truncate">{column.name}</span>
            </div>
            <button
              onClick={closePanel}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0 ml-2"
            >
              <X size={14} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-3 pt-2.5 pb-0">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-colors ${
                  tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── SETTINGS TAB ── */}
          {tab === 'settings' && (
            <div className="p-4 space-y-4">

              {/* Column name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Column Name
                </label>
                <div className="flex gap-2">
                  <input
                    ref={nameInputRef}
                    value={nameVal}
                    onChange={e => setNameVal(e.target.value)}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter') { saveName(); nameInputRef.current?.blur(); }
                      if (e.key === 'Escape') { setNameValState(column.name); nameRef.current = column.name; nameChanged.current = false; }
                    }}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                    placeholder="Column name"
                  />
                  <button
                    onClick={saveName}
                    className="px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-xl hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Width */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Width (px)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={60} max={800}
                    value={widthVal}
                    onChange={e => setWidthVal(e.target.value)}
                    onKeyDown={e => { e.stopPropagation(); if (e.key === 'Enter') saveWidth(); }}
                    onBlur={saveWidth}
                    className="w-20 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all tabular-nums"
                  />
                  <div className="flex gap-1 flex-1">
                    {[120, 180, 240, 320].map(w => (
                      <button
                        key={w}
                        onClick={() => { onSetWidth?.(w); setWidthVal(String(w)); }}
                        className={`flex-1 text-xs py-2 rounded-lg border transition-colors ${
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
              </div>

              {/* Type shortcut */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Column Type
                </label>
                <button
                  onClick={() => setTab('type')}
                  className="w-full flex items-center gap-3 px-3 py-2.5 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
                >
                  <span className="text-blue-600 flex-shrink-0">{curType.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{curType.label}</p>
                    <p className="text-xs text-slate-400">{curType.desc}</p>
                  </div>
                  <span className="text-xs text-blue-500 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    Change →
                  </span>
                </button>
              </div>

              {/* Options shortcut for dropdown */}
              {column.type === 'dropdown' && (
                <button
                  onClick={() => setTab('options')}
                  className="w-full flex items-center gap-2 px-3 py-2.5 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all text-left group"
                >
                  <List size={14} className="text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">Dropdown Options</p>
                    <p className="text-xs text-slate-400">
                      {(column.options ?? []).length} option{(column.options ?? []).length !== 1 ? 's' : ''} configured
                    </p>
                  </div>
                  <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    Manage →
                  </span>
                </button>
              )}

              {/* Position */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Position
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={onMoveLeft}
                    disabled={isFirst}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} /> Left
                  </button>
                  <button
                    onClick={onMoveRight}
                    disabled={isLast}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    Right <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-1 border-t border-slate-100 space-y-1">
                {onDuplicate && (
                  <button
                    onClick={() => { onDuplicate(); closePanel(); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    <Copy size={13} className="text-slate-400" />
                    Duplicate column
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-xl transition-all font-medium ${
                    deleteConfirm
                      ? 'bg-red-500 text-white'
                      : 'text-red-500 hover:bg-red-50'
                  }`}
                >
                  <Trash2 size={13} className={deleteConfirm ? 'text-white' : 'text-red-400'} />
                  {deleteConfirm ? 'Click again to confirm' : 'Delete column'}
                </button>
              </div>
            </div>
          )}

          {/* ── TYPE TAB ── */}
          {tab === 'type' && (
            <div className="p-3 space-y-1">
              <p className="text-xs text-slate-400 px-2 py-1">Select a type for this column</p>
              {(Object.entries(TYPE_META) as [ColumnType, (typeof TYPE_META)[ColumnType]][]).map(([type, meta]) => (
                <button
                  key={type}
                  onClick={() => {
                    onChangeType(type);
                    setTab(type === 'dropdown' ? 'options' : 'settings');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border ${
                    column.type === type
                      ? 'bg-blue-50 border-blue-200'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <span className={column.type === type ? 'text-blue-600' : 'text-slate-400'}>
                    {meta.icon}
                  </span>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-medium ${column.type === type ? 'text-blue-700' : 'text-slate-700'}`}>
                      {meta.label}
                    </p>
                    <p className="text-xs text-slate-400">{meta.desc}</p>
                  </div>
                  {column.type === type && <Check size={14} className="text-blue-600 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}

          {/* ── OPTIONS TAB (dropdown only) ── */}
          {tab === 'options' && (
            <div className="p-4">
              {/* Existing options */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto mb-4 pr-0.5">
                {(column.options ?? []).length === 0 && (
                  <div className="text-center py-6">
                    <List size={24} className="text-slate-200 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">No options yet</p>
                    <p className="text-xs text-slate-300">Add your first option below</p>
                  </div>
                )}
                {(column.options ?? []).map(opt => (
                  <div key={opt.id}>
                    {editOptId === opt.id ? (
                      /* Edit mode */
                      <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-2.5 py-2">
                        <ColorDot selected={editColor} onChange={setEditColor} />
                        <input
                          autoFocus
                          value={editLabel}
                          onChange={e => setEditLabel(e.target.value)}
                          onKeyDown={e => {
                            e.stopPropagation();
                            if (e.key === 'Enter') saveEditOpt(opt.id);
                            if (e.key === 'Escape') setEditOptId(null);
                          }}
                          className="flex-1 text-xs bg-transparent outline-none text-slate-700 font-medium min-w-0"
                          placeholder="Option label"
                        />
                        <button
                          onClick={() => saveEditOpt(opt.id)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg flex-shrink-0"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          onClick={() => setEditOptId(null)}
                          className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg flex-shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      /* View mode */
                      <div className="flex items-center gap-2 px-1.5 py-1 rounded-xl group/opt hover:bg-slate-50 transition-colors">
                        <GripVertical size={12} className="text-slate-300 flex-shrink-0 cursor-grab" />
                        <span className={`flex-1 text-xs px-2 py-1 rounded-lg font-medium truncate ${OPTION_COLOR_STYLES[opt.color] ?? 'bg-slate-100 text-slate-600'}`}>
                          {opt.label}
                        </span>
                        <button
                          onClick={() => startEditOpt(opt)}
                          className="opacity-0 group-hover/opt:opacity-100 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-all flex-shrink-0"
                          title="Edit"
                        >
                          <Pencil size={11} />
                        </button>
                        <button
                          onClick={() => onDeleteOption(opt.id)}
                          className="opacity-0 group-hover/opt:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                          title="Delete"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add new option */}
              <div className="border-t border-slate-100 pt-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Add Option</p>
                <div className="flex items-center gap-2">
                  <ColorDot selected={newOptColor} onChange={setNewOptColor} />
                  <input
                    value={newOptLabel}
                    onChange={e => setNewOptLabel(e.target.value)}
                    onKeyDown={e => {
                      e.stopPropagation();
                      if (e.key === 'Enter') handleAddOpt();
                    }}
                    placeholder="Type option name..."
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all min-w-0"
                  />
                  <button
                    onClick={handleAddOpt}
                    disabled={!newOptLabel.trim()}
                    className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                    title="Add option"
                  >
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

// ─── Color picker dot ─────────────────────────────────────────────────────────
const ColorDot: React.FC<{ selected: string; onChange: (c: string) => void }> = ({ selected, onChange }) => {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!show) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [show]);

  const selBg = (OPTION_COLOR_STYLES[selected] ?? 'bg-slate-100').split(' ')[0];

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setShow(s => !s); }}
        className={`w-6 h-6 rounded-full ${selBg} flex-shrink-0 transition-transform hover:scale-110`}
        style={{ boxShadow: '0 0 0 2px white, 0 0 0 3px rgba(0,0,0,0.12)' }}
        title="Pick color"
      />
      {show && (
        <div
          className="absolute bottom-full mb-2 left-0 bg-white border border-slate-200 rounded-xl p-2 shadow-xl z-[200] flex flex-wrap gap-1.5"
          style={{ width: 120 }}
          onMouseDown={e => e.stopPropagation()}
        >
          {OPTION_COLORS.map(c => {
            const bg = (OPTION_COLOR_STYLES[c.value] ?? 'bg-slate-100').split(' ')[0];
            return (
              <button
                key={c.value}
                title={c.label}
                onClick={e => { e.stopPropagation(); onChange(c.value); setShow(false); }}
                className={`w-6 h-6 rounded-full ${bg} transition-all hover:scale-110 border-2 ${
                  selected === c.value ? 'border-slate-700 scale-110' : 'border-transparent'
                }`}
                style={{ boxShadow: '0 0 0 1px rgba(0,0,0,0.08)' }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
