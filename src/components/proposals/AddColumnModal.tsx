import React, { useState, useEffect } from 'react';
import { X, Type, Hash, Calendar, Link2, List } from 'lucide-react';
import type { ColumnType } from '../../types/proposals';

interface AddColumnModalProps {
  onAdd: (name: string, type: ColumnType) => void;
  onClose: () => void;
}

const TYPES: { type: ColumnType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'text',     label: 'Free Text', icon: <Type size={16} />,     desc: 'Any text value' },
  { type: 'number',   label: 'Number',    icon: <Hash size={16} />,     desc: 'Numeric values' },
  { type: 'date',     label: 'Date',      icon: <Calendar size={16} />, desc: 'Date picker' },
  { type: 'link',     label: 'Link',      icon: <Link2 size={16} />,    desc: 'Clickable URL' },
  { type: 'dropdown', label: 'Dropdown',  icon: <List size={16} />,     desc: 'Preset options' },
];

export const AddColumnModal: React.FC<AddColumnModalProps> = ({ onAdd, onClose }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<ColumnType>('text');

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), type);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
        style={{ boxShadow: '0 24px 48px rgba(0,0,0,0.15)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Add Column
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Name */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Column Name</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="e.g. Contact Person"
            className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
          />
        </div>

        {/* Type selector */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Column Type</label>
          <div className="grid grid-cols-1 gap-1.5">
            {TYPES.map(t => (
              <button
                key={t.type}
                onClick={() => setType(t.type)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
                  type === t.type
                    ? 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <span className={type === t.type ? 'text-blue-600' : 'text-slate-400'}>{t.icon}</span>
                <div>
                  <p className="text-sm font-medium leading-none">{t.label}</p>
                  <p className="text-xs mt-0.5 opacity-60">{t.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!name.trim()}
            className="flex-1 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add Column
          </button>
        </div>
      </div>
    </div>
  );
};
