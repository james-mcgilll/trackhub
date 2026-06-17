import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import { calcScore, getTier } from '../types/leadPriority';
import type { LeadPriorityRecord } from '../types/leadPriority';

const LS_KEY = 'trackhub_lead_priority_v1';
const TABLE  = 'lead_priority_records';

const uid = () => `lp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ── localStorage fallback helpers ─────────────────────────────────────────────
function lsLoad(): LeadPriorityRecord[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
}
function lsSave(records: LeadPriorityRecord[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(records)); } catch { /* ignore */ }
}

// ── Try to ensure table exists (best-effort, won't throw) ─────────────────────
async function ensureTable(): Promise<boolean> {
  try {
    const { error } = await supabase.from(TABLE).select('id').limit(1);
    return !error;
  } catch { return false; }
}

export function useLeadPriority() {
  const [records, setRecords]       = useState<LeadPriorityRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [useSupabase, setUseSupabase] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      const ok = await ensureTable();
      setUseSupabase(ok);
      if (ok) {
        const { data } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false });
        setRecords((data ?? []) as LeadPriorityRecord[]);
      } else {
        setRecords(lsLoad());
      }
      setLoading(false);
    })();
  }, []);

  // ── Realtime (only if using Supabase) ─────────────────────────────────────
  useEffect(() => {
    if (!useSupabase) return;
    const ch = supabase.channel('lp_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, ({ eventType, new: n, old: o }) => {
        if (eventType === 'INSERT') { const r = n as LeadPriorityRecord; setRecords(prev => prev.find(x => x.id === r.id) ? prev : [r, ...prev]); }
        if (eventType === 'UPDATE') { const r = n as LeadPriorityRecord; setRecords(prev => prev.map(x => x.id === r.id ? r : x)); }
        if (eventType === 'DELETE') { const r = o as LeadPriorityRecord; setRecords(prev => prev.filter(x => x.id !== r.id)); }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [useSupabase]);

  // ── Save / upsert ─────────────────────────────────────────────────────────
  const saveRecord = useCallback(async (uniqueId: string, selectedCriteria: string[]) => {
    const score = calcScore(selectedCriteria);
    const tier  = getTier(score);
    const now   = new Date().toISOString();

    // Check if record exists for this unique_id
    const existing = records.find(r => r.unique_id === uniqueId);

    if (existing) {
      // Update
      const updated: LeadPriorityRecord = { ...existing, selected_criteria: selectedCriteria, score, tier, updated_at: now };
      setRecords(prev => prev.map(r => r.id === existing.id ? updated : r));
      if (useSupabase) {
        await supabase.from(TABLE).update({ selected_criteria: selectedCriteria, score, tier, updated_at: now }).eq('id', existing.id);
      } else {
        lsSave(records.map(r => r.id === existing.id ? updated : r));
      }
      return updated;
    } else {
      // Insert
      const record: LeadPriorityRecord = { id: uid(), unique_id: uniqueId, selected_criteria: selectedCriteria, score, tier, created_at: now, updated_at: now };
      setRecords(prev => [record, ...prev]);
      if (useSupabase) {
        await supabase.from(TABLE).insert(record);
      } else {
        lsSave([record, ...records]);
      }
      return record;
    }
  }, [records, useSupabase]);

  const deleteRecord = useCallback(async (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    if (useSupabase) {
      await supabase.from(TABLE).delete().eq('id', id);
    } else {
      lsSave(records.filter(r => r.id !== id));
    }
  }, [records, useSupabase]);

  const getByUniqueId = useCallback((uniqueId: string) => {
    return records.find(r => r.unique_id === uniqueId) ?? null;
  }, [records]);

  return { records, loading, useSupabase, saveRecord, deleteRecord, getByUniqueId };
}
