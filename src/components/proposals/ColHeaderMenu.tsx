import React, { useState, useRef, useEffect } from 'react';
import {
  MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight,
  Type, Hash, Calendar, Link2, List, Check, X, Plus,
} from 'lucide-react';
import type { Column, ColumnType, DropdownOption } from '../../types/proposals';
import { OPTION_COLORS, OPTION_COLOR_STYLES } from '../../types/proposals';

const TYPE_ICONS: Record<ColumnType, React.ReactNode> = {
  text:     <Type size={13} />,
  number:   <Hash size={13} />,
  date:     <Calendar size={13} />,
  link:     <Link2 size={13} />,
  dropdown: <List size={13} />,
};
const TYPE_LABELS: Record<ColumnType, string> = {
  text: 'Free Text', number: 'Number', date: 'Date', link: 'Link', dropdown: 'Dropdown',
};
const ALL_TYPES: ColumnType[] = ['text', 'number', 'date', 'link', 'dropdown'];

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
}

type Panel = 'main' | 'rename' | 'type' | 'dropdown';

export const ColHeaderMenu: React.FC<ColHeaderMenuProps> = ({
  column, isFirst, isLast,
  onRename, onChangeType, onDelete, onMoveLeft, onMoveRight,
  onAddOption, onUpdateOption, onDeleteOption,
}) => {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('main');
  const [renameVal, setRenameVal] = useState(column.name);
  const [editingOptId, setEditingOptId] = useState<string | null>(null);
  const [editOptLabel, setEditOptLabel] = useState('');
  const [editOptColor, setEditOptColor] = useState('blue');
  const [newOptLabel, setNewOptLabel] = useState('');
  const [newOptColor, setNewOptColor] = useState('blue');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPanel('main');
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const close = () => { setOpen(false); setPanel('main'); };

  const handleRename = () => {
    if (renameVal.trim()) { onRename(renameVal.trim()); close(); }
  };

  const startEditOpt = (opt: DropdownOption) => {
    setEditingOptId(opt.id);
    setEditOptLabel(opt.label);
    setEditOptColor(opt.color);
  };

  const saveEditOpt = (optId: string) => {
    if (editOptLabel.trim()) {
      onUpdateOption(optId, editOptLabel.trim(), editOptColor);
      setEditingOptId(null);
    }
  };

  const handleAddOpt = () => {
    if (newOptLabel.trim()) {
      onAddOption(newOptLabel.trim(), newOptColor);
      setNewOptLabel('');
      setNewOptColor('blue');
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => { setOpen(!open); setPanel('main'); setRenameVal(column.name); }}
        className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors opacity-0 group-hover:opacity-100"
      >
        <MoreHorizontal size={14} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-xl min-w-48"
          style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
        >
          {/* ── Main panel ── */}
          {panel === 'main' && (
            <div className="py-1.5">
              <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide border-b border-slate-50 mb-1">
                {column.name}
              </div>
              <MenuItem icon={<Pencil size={13} />} label="Rename column" onClick={() => setPanel('rename')} />
              <MenuItem icon={TYPE_ICONS[column.type]} label="Change type" onClick={() => setPanel('type')} />
              {column.type === 'dropdown' && (
                <MenuItem icon={<List size={13} />} label="Manage options" onClick={() => setPanel('dropdown')} />
              )}
              <div className="border-t border-slate-50 my-1" />
              <MenuItem icon={<ChevronLeft size={13} />} label="Move left"  onClick={() => { onMoveLeft(); close(); }}  disabled={isFirst} />
              <MenuItem icon={<ChevronRight size={13} />} label="Move right" onClick={() => { onMoveRight(); close(); }} disabled={isLast} />
              <div className="border-t border-slate-50 my-1" />
              <MenuItem icon={<Trash2 size={13} />} label="Delete column" onClick={() => { onDelete(); close(); }} danger />
            </div>
          )}

          {/* ── Rename panel ── */}
          {panel === 'rename' && (
            <div className="p-3">
              <PanelHeader title="Rename column" onBack={() => setPanel('main')} />
              <input
                autoFocus
                value={renameVal}
                onChange={e => setRenameVal(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleRename()}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 mt-2"
                placeholder="Column name"
              />
              <button
                onClick={handleRename}
                className="mt-2 w-full bg-blue-600 text-white text-sm font-medium rounded-lg py-1.5 hover:bg-blue-700 transition-colors"
              >
                Save
              </button>
            </div>
          )}

          {/* ── Type panel ── */}
          {panel === 'type' && (
            <div className="py-1.5">
              <PanelHeader title="Column type" onBack={() => setPanel('main')} className="px-3 pt-1 pb-2" />
              {ALL_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => { onChangeType(t); close(); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${column.type === t ? 'text-blue-600 font-medium' : 'text-slate-600'}`}
                >
                  <span className={column.type === t ? 'text-blue-600' : 'text-slate-400'}>{TYPE_ICONS[t]}</span>
                  {TYPE_LABELS[t]}
                  {column.type === t && <Check size={13} className="ml-auto text-blue-600" />}
                </button>
              ))}
            </div>
          )}

          {/* ── Dropdown options panel ── */}
          {panel === 'dropdown' && (
            <div className="p-3 w-64">
              <PanelHeader title="Dropdown options" onBack={() => setPanel('main')} />
              <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto pr-0.5">
                {(column.options ?? []).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-3">No options yet</p>
                )}
                {(column.options ?? []).map(opt => (
                  <div key={opt.id}>
                    {editingOptId === opt.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={editOptLabel}
                          onChange={e => setEditOptLabel(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && saveEditOpt(opt.id)}
                          className="flex-1 border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-400"
                        />
                        <ColorDot colors={OPTION_COLORS} selected={editOptColor} onChange={setEditOptColor} />
                        <button onClick={() => saveEditOpt(opt.id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={12} /></button>
                        <button onClick={() => setEditingOptId(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded"><X size={12} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group/opt">
                        <span className={`flex-1 text-xs px-2 py-1 rounded-md font-medium truncate ${OPTION_COLOR_STYLES[opt.color]}`}>
                          {opt.label}
                        </span>
                        <button onClick={() => startEditOpt(opt)} className="opacity-0 group-hover/opt:opacity-100 p-1 text-slate-400 hover:text-slate-600 rounded transition-opacity"><Pencil size={11} /></button>
                        <button onClick={() => onDeleteOption(opt.id)} className="opacity-0 group-hover/opt:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition-opacity"><Trash2 size={11} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Add new option */}
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-100">
                <input
                  value={newOptLabel}
                  onChange={e => setNewOptLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddOpt()}
                  className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-400"
                  placeholder="New option..."
                />
                <ColorDot colors={OPTION_COLORS} selected={newOptColor} onChange={setNewOptColor} />
                <button
                  onClick={handleAddOpt}
                  disabled={!newOptLabel.trim()}
                  className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Helpers ──────────────────────────────────────────────────────────────────

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}
const MenuItem: React.FC<MenuItemProps> = ({ icon, label, onClick, danger, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed
      ${danger ? 'text-red-500 hover:bg-red-50' : 'text-slate-600 hover:bg-slate-50'}`}
  >
    <span className={danger ? 'text-red-400' : 'text-slate-400'}>{icon}</span>
    {label}
  </button>
);

interface PanelHeaderProps {
  title: string;
  onBack: () => void;
  className?: string;
}
const PanelHeader: React.FC<PanelHeaderProps> = ({ title, onBack, className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <button onClick={onBack} className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
      <ChevronLeft size={14} />
    </button>
    <span className="text-xs font-semibold text-slate-600">{title}</span>
  </div>
);

interface ColorDotProps {
  colors: { label: string; value: string }[];
  selected: string;
  onChange: (c: string) => void;
}
const ColorDot: React.FC<ColorDotProps> = ({ colors, selected, onChange }) => {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShow(false); };
    if (show) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [show]);

  const selStyle = OPTION_COLOR_STYLES[selected] ?? 'bg-slate-100';
  const selClass = selStyle.split(' ')[0]; // just bg- part

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setShow(!show)}
        className={`w-5 h-5 rounded-full ${selClass} border-2 border-white shadow-sm`}
        title="Pick color"
      />
      {show && (
        <div className="absolute bottom-full mb-1 right-0 bg-white border border-slate-200 rounded-lg p-1.5 shadow-lg flex gap-1 flex-wrap w-28 z-10">
          {colors.map(c => {
            const bg = (OPTION_COLOR_STYLES[c.value] ?? 'bg-slate-100').split(' ')[0];
            return (
              <button
                key={c.value}
                onClick={() => { onChange(c.value); setShow(false); }}
                className={`w-5 h-5 rounded-full ${bg} border-2 transition-transform hover:scale-110 ${selected === c.value ? 'border-slate-600 scale-110' : 'border-transparent'}`}
                title={c.label}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
