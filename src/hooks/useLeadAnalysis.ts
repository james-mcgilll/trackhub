import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../utils/supabase';
import type { LAColumn, LARow } from '../types/leadAnalysis';
import { LA_COLUMNS_KEY, LA_ROWS_KEY, LA_QUALIFYING_STAGES } from '../types/leadAnalysis';
import type { Column, Row } from '../types/proposals';

const uid = (p = 'id') => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function lsGet<T>(key: string, fallback: T): T {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; }
  catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

function detectStatusCol(cols: Column[]): Column | null {
  const byName = cols.find(c =>
    c.type === 'dropdown' && c.name.toLowerCase().includes('status')
  );
  if (byName) return byName;
  return cols.find(c => {
    if (c.type !== 'dropdown' || !c.options) return false;
    const labels = c.options.map(o => o.label.toLowerCase());
    return LA_QUALIFYING_STAGES.filter(s => labels.includes(s)).length >= 2;
  }) ?? null;
}

export function useLeadAnalysis(
  proposalColumns: Column[],
  proposalRows: Row[],  // kept for option label resolution
) {
  const [laColumns, setLaColumns] = useState<LAColumn[]>(() => lsGet(LA_COLUMNS_KEY, []));
  const [laRows,    setLaRows]    = useState<LARow[]>(()    => lsGet(LA_ROWS_KEY,    []));
  const [loading,   setLoading]   = useState(false);

  useEffect(() => { lsSet(LA_COLUMNS_KEY, laColumns); }, [laColumns]);
  useEffect(() => { lsSet(LA_ROWS_KEY,    laRows);    }, [laRows]);

  const statusCol = useMemo(() => detectStatusCol(proposalColumns), [proposalColumns]);

  // ── Core sync: fetch ALL qualifying rows directly from Supabase ─────────────
  // This bypasses localStorage limits and always reflects current Supabase data
  const syncFromSupabase = useCallback(async () => {
    if (!statusCol) return;

    setLoading(true);
    try {
      // Get ALL proposal rows from Supabase with no limit cap
      let allRows: Row[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('proposal_rows')
          .select('id, display_id, data')
          .order('created_at')
          .range(from, from + PAGE - 1);
        if (error || !data || data.length === 0) break;
        allRows = [...allRows, ...data as Row[]];
        if (data.length < PAGE) break;
        from += PAGE;
      }

      // Find qualifying unique IDs
      const qualifyingIds = new Set<string>();
      for (const row of allRows) {
        const val = row.data[statusCol.id] ?? '';
        const opt = statusCol.options?.find(o => o.id === val);
        if (opt && LA_QUALIFYING_STAGES.includes(opt.label.toLowerCase())) {
          if (row.display_id) qualifyingIds.add(row.display_id);
        }
      }

      // Merge with existing laRows — preserve local data, add missing, remove nothing
      setLaRows(prev => {
        const existingMap: Record<string, LARow> = {};
        for (const r of prev) existingMap[r.uniqueId] = r;

        const synced: LARow[] = Array.from(qualifyingIds).map(id =>
          existingMap[id] ?? {
            uniqueId: id,
            localData: {},
            createdAt: new Date().toISOString(),
          }
        );

        return synced.sort((a, b) => {
          const na = parseInt(a.uniqueId.replace('UP', ''), 10);
          const nb = parseInt(b.uniqueId.replace('UP', ''), 10);
          return nb - na;
        });
      });
    } catch (e) {
      console.warn('Lead Analysis sync failed, falling back to prop data', e);
      // Fallback: use proposalRows prop
      syncFromProps();
    } finally {
      setLoading(false);
    }
  }, [statusCol, proposalColumns]);

  // ── Fallback sync from props (for local HTML file / offline) ────────────────
  const syncFromProps = useCallback(() => {
    if (!statusCol) return;
    const qualifyingIds = new Set<string>();
    for (const row of proposalRows) {
      const val = row.data[statusCol.id] ?? '';
      const opt = statusCol.options?.find(o => o.id === val);
      if (opt && LA_QUALIFYING_STAGES.includes(opt.label.toLowerCase())) {
        if (row.display_id) qualifyingIds.add(row.display_id);
      }
    }
    setLaRows(prev => {
      const existingMap: Record<string, LARow> = {};
      for (const r of prev) existingMap[r.uniqueId] = r;
      const synced: LARow[] = Array.from(qualifyingIds).map(id =>
        existingMap[id] ?? { uniqueId: id, localData: {}, createdAt: new Date().toISOString() }
      );
      return synced.sort((a, b) => {
        const na = parseInt(a.uniqueId.replace('UP', ''), 10);
        const nb = parseInt(b.uniqueId.replace('UP', ''), 10);
        return nb - na;
      });
    });
  }, [statusCol, proposalRows]);

  // ── Initial sync on mount ────────────────────────────────────────────────────
  const hasSynced = useRef(false);
  useEffect(() => {
    if (!statusCol || hasSynced.current) return;
    hasSynced.current = true;
    syncFromSupabase();
  }, [statusCol, syncFromSupabase]);

  // ── Realtime: when proposal_rows changes, re-sync ────────────────────────────
  useEffect(() => {
    if (!statusCol) return;
    const ch = supabase.channel('la_rows_watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposal_rows' },
        () => {
          // Debounce — wait 1s then resync
          setTimeout(() => syncFromSupabase(), 1000);
        }
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [statusCol, syncFromSupabase]);

  // ── Build option label map for display ───────────────────────────────────────
  const optionLabelMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const col of proposalColumns) {
      if (col.type === 'dropdown' && col.options) {
        map[col.id] = {};
        for (const opt of col.options) map[col.id][opt.id] = opt.label;
      }
    }
    return map;
  }, [proposalColumns]);

  const proposalRowByUniqueId = useMemo(() => {
    const map: Record<string, Row> = {};
    for (const row of proposalRows) {
      if (row.display_id) map[row.display_id] = row;
    }
    return map;
  }, [proposalRows]);

  // ── Merged rows for display ───────────────────────────────────────────────────
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
        ? (statusCol.options?.find(o => o.id === proposalRow.data[statusCol.id])?.label ?? '')
        : '';
      return { uniqueId: laRow.uniqueId, data: merged, currentStatus };
    });
  }, [laRows, laColumns, proposalRowByUniqueId, statusCol, optionLabelMap]);

  // ── Column operations ─────────────────────────────────────────────────────────
  const addLinkedColumn = useCallback((name: string, linkedColId: string, type: LAColumn['type']) => {
    const maxOrder = laColumns.length > 0 ? Math.max(...laColumns.map(c => c.order)) : -1;
    const newCol: LAColumn = { id: uid('lac'), name, source: 'linked', linkedColId, type, options: null, width: 180, order: maxOrder + 1 };
    setLaColumns(prev => [...prev, newCol].sort((a, b) => a.order - b.order));
  }, [laColumns]);

  const addLocalColumn = useCallback((name: string, type: LAColumn['type'], options: { label: string; color: string }[] = []) => {
    const maxOrder = laColumns.length > 0 ? Math.max(...laColumns.map(c => c.order)) : -1;
    const newCol: LAColumn = { id: uid('lac'), name, source: 'local', type, options: type === 'dropdown' ? options.map(o => ({ id: uid('opt'), ...o })) : null, width: 180, order: maxOrder + 1 };
    setLaColumns(prev => [...prev, newCol].sort((a, b) => a.order - b.order));
  }, [laColumns]);

  const deleteColumn = useCallback((colId: string) => {
    setLaColumns(prev => prev.filter(c => c.id !== colId));
    setLaRows(prev => prev.map(r => {
      const { [colId]: _, ...rest } = r.localData;
      return { ...r, localData: rest };
    }));
  }, []);

  const renameColumn       = useCallback((colId: string, name: string)            => { setLaColumns(prev => prev.map(c => c.id === colId ? { ...c, name } : c)); }, []);
  const resizeColumn       = useCallback((colId: string, width: number)            => { setLaColumns(prev => prev.map(c => c.id === colId ? { ...c, width: Math.max(80, width) } : c)); }, []);
  const updateColumnOptions = useCallback((colId: string, options: LAColumn['options']) => { setLaColumns(prev => prev.map(c => c.id === colId ? { ...c, options } : c)); }, []);

  const reorderColumns = useCallback((sourceId: string, targetId: string, position: 'before' | 'after') => {
    setLaColumns(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const without = sorted.filter(c => c.id !== sourceId);
      const targetIdx = without.findIndex(c => c.id === targetId);
      if (targetIdx === -1) return prev;
      const insertAt = position === 'before' ? targetIdx : targetIdx + 1;
      without.splice(insertAt, 0, sorted.find(c => c.id === sourceId)!);
      return without.map((c, i) => ({ ...c, order: i }));
    });
  }, []);

  const updateCell = useCallback((uniqueId: string, colId: string, value: string) => {
    setLaRows(prev => prev.map(r =>
      r.uniqueId === uniqueId ? { ...r, localData: { ...r.localData, [colId]: value } } : r
    ));
  }, []);

  return {
    laColumns: [...laColumns].sort((a, b) => a.order - b.order),
    mergedRows,
    laRows,
    loading,
    statusCol,
    proposalColumns,
    forceResync: syncFromSupabase,
    addLinkedColumn, addLocalColumn,
    deleteColumn, renameColumn, resizeColumn, reorderColumns,
    updateColumnOptions, updateCell,
  };
}
