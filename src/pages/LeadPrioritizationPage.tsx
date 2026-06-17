import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { CriteriaChecklist } from '../components/leadPriority/CriteriaChecklist';
import { ScoreDisplay } from '../components/leadPriority/ScoreDisplay';
import { SavedRecords } from '../components/leadPriority/SavedRecords';
import { TierBadge } from '../components/leadPriority/TierBadge';
import { useLeadPriority } from '../hooks/useLeadPriority';
import { calcScore, getTier, CRITERIA } from '../types/leadPriority';
import type { LeadPriorityRecord } from '../types/leadPriority';

export const LeadPrioritizationPage: React.FC = () => {
  const { records, loading, saveRecord, deleteRecord, getByUniqueId } = useLeadPriority();

  const [uniqueId, setUniqueId]         = useState('');
  const [selected, setSelected]         = useState<string[]>([]);
  const [editingId, setEditingId]       = useState<string | null>(null); // internal record id
  const [saveStatus, setSaveStatus]     = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [existingWarning, setExisting]  = useState(false);

  const score = calcScore(selected);
  const tier  = getTier(score);

  // When uniqueId changes, check if a record already exists
  useEffect(() => {
    if (!uniqueId.trim()) { setExisting(false); return; }
    const existing = getByUniqueId(uniqueId.trim().toUpperCase());
    setExisting(!!existing && editingId !== existing.id);
  }, [uniqueId, records, editingId, getByUniqueId]);

  const handleReset = () => {
    setSelected([]);
    setUniqueId('');
    setEditingId(null);
    setSaveStatus('idle');
    setExisting(false);
  };

  const handleEdit = (record: LeadPriorityRecord) => {
    setUniqueId(record.unique_id);
    setSelected(record.selected_criteria);
    setEditingId(record.id);
    setSaveStatus('idle');
    setExisting(false);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async () => {
    const uid = uniqueId.trim().toUpperCase();
    if (!uid) return;
    setSaveStatus('saving');
    try {
      await saveRecord(uid, selected);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
      setEditingId(null);
      setExisting(false);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleLoadExisting = () => {
    const uid = uniqueId.trim().toUpperCase();
    const existing = getByUniqueId(uid);
    if (existing) handleEdit(existing);
  };

  const isEditing = editingId !== null;
  const canSave   = uniqueId.trim().length > 0;

  return (
    <div className="max-w-screen-lg mx-auto space-y-6">
      <PageHeader
        title="Lead Prioritization"
        subtitle="Score and categorize leads based on fixed checkpoints."
        actions={
          <div className="flex items-center gap-2">
            {isEditing && (
              <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-1.5 rounded-xl font-medium">
                Editing {uniqueId}
              </span>
            )}
            <button onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: checklist ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Unique ID input */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Lead Unique ID
            </label>
            <div className="flex gap-2">
              <input
                value={uniqueId}
                onChange={e => setUniqueId(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && canSave && handleSave()}
                placeholder="e.g. UP001"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 font-mono font-semibold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all placeholder:font-normal placeholder:text-slate-400"
              />
              {/* Datalist of existing proposal IDs from records */}
              <datalist id="uid-list">
                {records.map(r => <option key={r.id} value={r.unique_id} />)}
              </datalist>
            </div>

            {/* Warning: existing record */}
            {existingWarning && (
              <div className="mt-3 flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5">
                <AlertCircle size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-700">Record already exists for {uniqueId}</p>
                  <p className="text-xs text-amber-600 mt-0.5">Saving will update the existing record. Or load it to edit.</p>
                </div>
                <button onClick={handleLoadExisting}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex-shrink-0 underline">
                  Load
                </button>
              </div>
            )}
          </div>

          {/* Checklist */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <CriteriaChecklist selected={selected} onChange={setSelected} />
          </div>
        </div>

        {/* ── Right: score + save ── */}
        <div className="space-y-4 lg:sticky lg:top-4 self-start">
          {/* Score */}
          <ScoreDisplay score={score} />

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!canSave || saveStatus === 'saving'}
            className={`
              w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all
              ${saveStatus === 'saved'  ? 'bg-emerald-500 text-white' :
                saveStatus === 'error'  ? 'bg-red-500 text-white' :
                saveStatus === 'saving' ? 'bg-blue-400 text-white cursor-wait' :
                canSave                 ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200' :
                                          'bg-slate-100 text-slate-400 cursor-not-allowed'
              }
            `}
          >
            {saveStatus === 'saved'  ? <><CheckCircle2 size={16} /> Saved!</> :
             saveStatus === 'error'  ? <><AlertCircle size={16} /> Error — try again</> :
             saveStatus === 'saving' ? <>Saving...</> :
             <><Save size={16} /> {isEditing ? 'Update Record' : 'Save Record'}</>
            }
          </button>

          {/* Quick summary */}
          {selected.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Summary</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Criteria selected</span>
                  <span className="font-semibold text-slate-700">{selected.length}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-600">Positive</span>
                  <span className="font-semibold text-emerald-600">
                    +{selected.reduce((s, id) => { const c = CRITERIA.find(cr => cr.id === id && cr.type === 'positive'); return s + (c?.points ?? 0); }, 0)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-red-500">Negative</span>
                  <span className="font-semibold text-red-500">
                    {selected.reduce((s, id) => { const c = CRITERIA.find(cr => cr.id === id && cr.type === 'negative'); return s + (c?.points ?? 0); }, 0)}
                  </span>
                </div>
                <div className="border-t border-slate-100 pt-2 flex justify-between text-sm">
                  <span className="font-semibold text-slate-600">Final Score</span>
                  <span className="font-bold text-slate-800">{score > 0 ? `+${score}` : score}</span>
                </div>
              </div>
              <TierBadge tier={tier} size="sm" />
            </div>
          )}

          {/* Tier reference */}
          <div className="bg-white rounded-2xl border border-slate-100 p-4" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Tier Reference</p>
            <div className="space-y-2">
              {([
                { tier: 'High Tier' as const,   range: '35 to 50+', color: 'text-emerald-600' },
                { tier: 'Medium Tier' as const,  range: '20 to 34',  color: 'text-amber-600'  },
                { tier: 'Low Tier' as const,     range: '0 to 19',   color: 'text-slate-500'  },
              ]).map(({ tier: t, range, color }) => (
                <div key={t} className={`flex items-center justify-between rounded-xl px-3 py-2 ${t === tier ? 'bg-slate-50' : ''}`}>
                  <TierBadge tier={t} size="sm" />
                  <span className={`text-xs font-medium ${color}`}>{range}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Saved records */}
      {!loading && (
        <SavedRecords
          records={records}
          onEdit={handleEdit}
          onDelete={deleteRecord}
        />
      )}
    </div>
  );
};
