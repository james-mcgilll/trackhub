import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabase';
import type { LAColumn, LARow } from '../types/leadAnalysis';
import { LA_QUALIFYING_STAGES } from '../types/leadAnalysis';
import type { Column, Row } from '../types/proposals';

const uid = (p = 'id') => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
function bg(p: PromiseLike<unknown>) { Promise.resolve(p).catch(() => {}); }

function detectStatusCol(cols: Column[]): Column | null {
  const byName = cols.find(c => c.type === 'dropdown' && c.name.toLowerCase().includes('status'));
  if (byName) return byName;
  return cols.find(c => {
    if (c.type !== 'dropdown' || !c.options) return false;
    const labels = c.options.map(o => o.label.toLowerCase());
    return LA_QUALIFYING_STAGES.filter(s => labels.includes(s)).length >= 2;
  }) ?? null;
}

export function useLeadAnalysis(proposalColumns: Column[], proposalRows: Row[]) {
  const [laColumns,   setLaColumns]   = useState<LAColumn[]>([]);
  const [laRows,      setLaRows]      = useState<LARow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [syncStatus,  setSyncStatus]  = useState('');

  const statusCol = useMemo(() => detectStatusCol(proposalColumns), [proposalColumns]);

  // ── Load LA columns and rows from Supabase ──────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data: colData, error: colErr } = await supabase
          .from('la_columns').select('*').order('order');
        if (!colErr && colData) setLaColumns(colData as LAColumn[]);
        else if (colErr) console.warn('la_columns table not ready:', colErr.message);

        const { data: rowData, error: rowErr } = await supabase
          .from('la_rows').select('*').order('created_at');
        if (!rowErr && rowData) {
          // Map snake_case from Supabase to camelCase LARow
          const mapped: LARow[] = rowData.map((r: any) => ({
            uniqueId:  r.unique_id,
            localData: r.local_data ?? {},
            createdAt: r.created_at,
          }));
          setLaRows(mapped);
        } else if (rowErr) console.warn('la_rows table not ready:', rowErr.message);
      } catch (e) {
        console.warn('LA load error — tables may not exist yet:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Sync qualifying leads from proposal data ────────────────────────────────
  const syncLeads = useCallback(async () => {
    if (proposalRows.length === 0 || !statusCol) return;

    setSyncStatus('Syncing...');

    // Build option map from proposalColumns
    const optionMap: Record<string, string> = {};
    for (const opt of statusCol.options ?? []) {
      optionMap[(opt as any).id] = (opt as any).label;
      optionMap[(opt as any).label.toLowerCase()] = (opt as any).label;
    }

    // Find qualifying IDs
    const qualifyingIds: string[] = [];
    for (const row of proposalRows) {
      const val = row.data[statusCol.id] ?? '';
      if (!val) continue;
      const label = optionMap[val] ?? optionMap[val.toLowerCase()] ?? val;
      if (LA_QUALIFYING_STAGES.includes(label.toLowerCase()) && row.display_id) {
        qualifyingIds.push(row.display_id);
      }
    }

    if (qualifyingIds.length === 0) { setSyncStatus(''); return; }

    // Get existing LA rows from Supabase
    const { data: existing } = await supabase.from('la_rows').select('unique_id, local_data, created_at');
    const existingMap: Record<string, any> = {};
    for (const r of existing ?? []) existingMap[r.unique_id] = r;

    // Add missing qualifying rows to Supabase
    const toAdd = qualifyingIds
      .filter(id => !existingMap[id])
      .map(id => ({ unique_id: id, local_data: {}, created_at: new Date().toISOString() }));

    if (toAdd.length > 0) {
      await supabase.from('la_rows').insert(toAdd);
    }

    // Build full list
    const allLaRows: LARow[] = qualifyingIds.map(id =>
      existingMap[id]
        ? { uniqueId: id, localData: existingMap[id].local_data ?? {}, createdAt: existingMap[id].created_at }
        : { uniqueId: id, localData: {}, createdAt: new Date().toISOString() }
    ).sort((a, b) => {
      const na = parseInt(a.uniqueId.replace('UP', ''), 10);
      const nb = parseInt(b.uniqueId.replace('UP', ''), 10);
      return nb - na;
    });

    setLaRows(allLaRows);
    setSyncStatus(`${qualifyingIds.length} leads`);
    setTimeout(() => setSyncStatus(''), 2000);
  }, [proposalRows, statusCol]);

  // Run sync when proposal data is loaded
  useEffect(() => {
    if (proposalRows.length > 0 && statusCol) syncLeads();
  }, [proposalRows.length, statusCol?.id]);

  // ── Option label map ──────────────────────────────────────────────────────
  const optionLabelMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const col of proposalColumns) {
      if (col.type === 'dropdown' && col.options) {
        map[col.id] = {};
        for (const opt of col.options as {id:string;label:string}[]) {
          map[col.id][opt.id] = opt.label;
        }
      }
    }
    return map;
  }, [proposalColumns]);

  const proposalRowByUniqueId = useMemo(() => {
    const map: Record<string, Row> = {};
    for (const row of proposalRows) { if (row.display_id) map[row.display_id] = row; }
    return map;
  }, [proposalRows]);

  // ── Merged rows ────────────────────────────────────────────────────────────
  const mergedRows = useMemo(() => {
    return laRows.map(laRow => {
      const proposalRow = proposalRowByUniqueId[laRow.uniqueId];
      const merged: Record<string, string> = {};
      for (const col of laColumns) {
        if (col.source === 'linked' && col.linkedColId && proposalRow) {
          const rawValue = proposalRow.data[col.linkedColId] ?? '';
          const labelMap = optionLabelMap[col.linkedColId];
          merged[col.id] = labelMap ? (labelMap[rawValue] ?? rawValue) : rawValue;
        } else if (col.source === 'local') {
          merged[col.id] = laRow.localData[col.id] ?? '';
        }
      }
      const currentStatus = proposalRow && statusCol
        ? (statusCol.options?.find((o: any) => o.id === proposalRow.data[statusCol.id])?.label ?? '')
        : '';
      return { uniqueId: laRow.uniqueId, data: merged, currentStatus };
    });
  }, [laRows, laColumns, proposalRowByUniqueId, statusCol, optionLabelMap]);

  // ── Column operations — saved to Supabase ──────────────────────────────────
  const addLinkedColumn = useCallback((name: string, linkedColId: string, type: LAColumn['type']) => {
    const maxOrder = laColumns.length > 0 ? Math.max(...laColumns.map(c => c.order)) : -1;
    const newCol: LAColumn = { id: uid('lac'), name, source: 'linked', linkedColId, type, options: null, width: 180, order: maxOrder + 1 };
    setLaColumns(prev => [...prev, newCol].sort((a, b) => a.order - b.order));
    bg(supabase.from('la_columns').insert(newCol));
  }, [laColumns]);

  const addLocalColumn = useCallback((name: string, type: LAColumn['type'], options: {label:string;color:string}[] = []) => {
    const maxOrder = laColumns.length > 0 ? Math.max(...laColumns.map(c => c.order)) : -1;
    const newCol: LAColumn = { id: uid('lac'), name, source: 'local', type, options: type === 'dropdown' ? options.map(o => ({ id: uid('opt'), ...o })) : null, width: 180, order: maxOrder + 1 };
    setLaColumns(prev => [...prev, newCol].sort((a, b) => a.order - b.order));
    bg(supabase.from('la_columns').insert(newCol));
  }, [laColumns]);

  const deleteColumn = useCallback((colId: string) => {
    setLaColumns(prev => prev.filter(c => c.id !== colId));
    setLaRows(prev => prev.map(r => { const { [colId]: _, ...rest } = r.localData; return { ...r, localData: rest }; }));
    bg(supabase.from('la_columns').delete().eq('id', colId));
  }, []);

  const renameColumn = useCallback((colId: string, name: string) => {
    setLaColumns(prev => prev.map(c => c.id === colId ? { ...c, name } : c));
    bg(supabase.from('la_columns').update({ name }).eq('id', colId));
  }, []);

  const resizeColumn = useCallback((colId: string, width: number) => {
    const w = Math.max(80, width);
    setLaColumns(prev => prev.map(c => c.id === colId ? { ...c, width: w } : c));
    bg(supabase.from('la_columns').update({ width: w }).eq('id', colId));
  }, []);

  const updateColumnOptions = useCallback((colId: string, options: LAColumn['options']) => {
    setLaColumns(prev => prev.map(c => c.id === colId ? { ...c, options } : c));
    bg(supabase.from('la_columns').update({ options }).eq('id', colId));
  }, []);

  const reorderColumns = useCallback((sourceId: string, targetId: string, position: 'before' | 'after') => {
    setLaColumns(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const without = sorted.filter(c => c.id !== sourceId);
      const targetIdx = without.findIndex(c => c.id === targetId);
      if (targetIdx === -1) return prev;
      const insertAt = position === 'before' ? targetIdx : targetIdx + 1;
      without.splice(insertAt, 0, sorted.find(c => c.id === sourceId)!);
      const reordered = without.map((c, i) => ({ ...c, order: i }));
      reordered.forEach(c => {
        if (sorted.find(x => x.id === c.id)?.order !== c.order)
          bg(supabase.from('la_columns').update({ order: c.order }).eq('id', c.id));
      });
      return reordered;
    });
  }, []);

  // ── Cell update — saved to Supabase ────────────────────────────────────────
  const updateCell = useCallback((uniqueId: string, colId: string, value: string) => {
    setLaRows(prev => prev.map(r => {
      if (r.uniqueId !== uniqueId) return r;
      const newLocalData = { ...r.localData, [colId]: value };
      bg(supabase.from('la_rows').update({ local_data: newLocalData }).eq('unique_id', uniqueId));
      return { ...r, localData: newLocalData };
    }));
  }, []);

  // ── Bulk import: only updates local columns, never touches linked columns ──
  const importLocalData = useCallback((updates: { uniqueId: string; colId: string; value: string }[]) => {
    // Group updates by uniqueId
    const byId: Record<string, Record<string, string>> = {};
    for (const u of updates) {
      if (!byId[u.uniqueId]) byId[u.uniqueId] = {};
      byId[u.uniqueId][u.colId] = u.value;
    }
    setLaRows(prev => prev.map(r => {
      const colUpdates = byId[r.uniqueId];
      if (!colUpdates) return r;
      const newLocalData = { ...r.localData, ...colUpdates };
      bg(supabase.from('la_rows').update({ local_data: newLocalData }).eq('unique_id', r.uniqueId));
      return { ...r, localData: newLocalData };
    }));
  }, []);

  return {
    laColumns: [...laColumns].sort((a, b) => a.order - b.order),
    mergedRows, laRows, loading, syncStatus, statusCol,
    proposalColumns, forceResync: syncLeads,
    addLinkedColumn, addLocalColumn,
    deleteColumn, renameColumn, resizeColumn, reorderColumns,
    updateColumnOptions, updateCell, importLocalData,
  };
}
