import { useState, useCallback, useEffect, useMemo } from 'react';
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
  proposalRows: Row[],
) {
  const [laColumns, setLaColumns] = useState<LAColumn[]>(() => lsGet(LA_COLUMNS_KEY, []));
  const [laRows,    setLaRows]    = useState<LARow[]>(()    => lsGet(LA_ROWS_KEY,    []));
  const [loading,   setLoading]   = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');

  useEffect(() => { lsSet(LA_COLUMNS_KEY, laColumns); }, [laColumns]);
  useEffect(() => { lsSet(LA_ROWS_KEY,    laRows);    }, [laRows]);

  const statusCol = useMemo(() => detectStatusCol(proposalColumns), [proposalColumns]);

  // ── Full self-contained sync from Supabase ───────────────────────────────────
  // Fetches columns and rows fresh from Supabase — no dependency on props state
  const syncFromSupabase = useCallback(async () => {
    setLoading(true);
    setSyncStatus('Fetching columns...');
    try {
      // Step 1: Get columns fresh from Supabase
      const { data: colData, error: colErr } = await supabase
        .from('proposal_columns')
        .select('*')
        .order('order');

      if (colErr || !colData) {
        setSyncStatus('Failed to fetch columns — using local data');
        syncFromProps();
        return;
      }

      const cols = colData as Column[];
      const sc = detectStatusCol(cols);

      if (!sc) {
        setSyncStatus('No status column found');
        syncFromProps();
        return;
      }

      setSyncStatus('Fetching rows...');

      // Step 2: Fetch ALL rows in pages of 1000
      let allRows: Row[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data: rowData, error: rowErr } = await supabase
          .from('proposal_rows')
          .select('id, display_id, data')
          .range(from, from + PAGE - 1);

        if (rowErr) { console.warn('Row fetch error:', rowErr); break; }
        if (!rowData || rowData.length === 0) break;
        allRows = [...allRows, ...(rowData as Row[])];
        if (rowData.length < PAGE) break;
        from += PAGE;
      }

      setSyncStatus(`Processing ${allRows.length} rows...`);

      // Step 3: Find qualifying IDs
      // Match by option ID OR by label directly (handles both storage formats)
      const qualifyingIds: string[] = [];
      for (const row of allRows) {
        const val = row.data?.[sc.id] ?? '';
        if (!val) continue;

        // Try matching by option ID first
        const optById = sc.options?.find(o => o.id === val);
        if (optById && LA_QUALIFYING_STAGES.includes(optById.label.toLowerCase())) {
          if (row.display_id) qualifyingIds.push(row.display_id);
          continue;
        }

        // Try matching by label directly (e.g. value stored as "Contacted")
        if (LA_QUALIFYING_STAGES.includes(val.toLowerCase())) {
          if (row.display_id) qualifyingIds.push(row.display_id);
          continue;
        }

        // Try matching by label case-insensitive via options
        const optByLabel = sc.options?.find(o => o.label.toLowerCase() === val.toLowerCase());
        if (optByLabel && LA_QUALIFYING_STAGES.includes(optByLabel.label.toLowerCase())) {
          if (row.display_id) qualifyingIds.push(row.display_id);
        }
      }

      setSyncStatus(`Found ${qualifyingIds.length} qualifying leads`);

      if (qualifyingIds.length === 0) {
        setSyncStatus('No Contacted/Interviewed/Hired leads found');
        return;
      }

      // Step 4: Merge with existing — preserve all local data
      setLaRows(prev => {
        const existingMap: Record<string, LARow> = {};
        for (const r of prev) existingMap[r.uniqueId] = r;

        const merged: LARow[] = qualifyingIds.map(id =>
          existingMap[id] ?? {
            uniqueId: id,
            localData: {},
            createdAt: new Date().toISOString(),
          }
        );

        return merged.sort((a, b) => {
          const na = parseInt(a.uniqueId.replace('UP', ''), 10);
          const nb = parseInt(b.uniqueId.replace('UP', ''), 10);
          return nb - na;
        });
      });

      setTimeout(() => setSyncStatus(''), 3000);
    } catch (e) {
      console.error('Sync error:', e);
      setSyncStatus('Sync failed — using local data');
      syncFromProps();
    } finally {
      setLoading(false);
    }
  }, []); // no dependencies — fully self-contained

  // ── Fallback: sync from props (works without Supabase) ──────────────────────
  const syncFromProps = useCallback(() => {
    if (!statusCol || proposalRows.length === 0) return;
    const qualifyingIds: string[] = [];
    for (const row of proposalRows) {
      const val = row.data[statusCol.id] ?? '';
      if (!val) continue;
      const optById    = statusCol.options?.find(o => o.id === val);
      const optByLabel = statusCol.options?.find(o => o.label.toLowerCase() === val.toLowerCase());
      const matched    = optById ?? optByLabel;
      const isQualify  = matched
        ? LA_QUALIFYING_STAGES.includes(matched.label.toLowerCase())
        : LA_QUALIFYING_STAGES.includes(val.toLowerCase());
      if (isQualify && row.display_id) qualifyingIds.push(row.display_id);
    }
    setLaRows(prev => {
      const existingMap: Record<string, LARow> = {};
      for (const r of prev) existingMap[r.uniqueId] = r;
      const merged: LARow[] = qualifyingIds.map(id =>
        existingMap[id] ?? { uniqueId: id, localData: {}, createdAt: new Date().toISOString() }
      );
      return merged.sort((a, b) => {
        const na = parseInt(a.uniqueId.replace('UP', ''), 10);
        const nb = parseInt(b.uniqueId.replace('UP', ''), 10);
        return nb - na;
      });
    });
  }, [statusCol, proposalRows]);

  // ── Auto-sync on mount ───────────────────────────────────────────────────────
  useEffect(() => {
    syncFromSupabase();
  }, []); // runs once on mount

  // ── Also sync from props when they change (backup) ───────────────────────────
  useEffect(() => {
    if (proposalRows.length > 0 && statusCol) {
      syncFromProps();
    }
  }, [proposalRows.length, statusCol]); // eslint-disable-line

  // ── Realtime: re-sync when proposal_rows changes ─────────────────────────────
  useEffect(() => {
    const ch = supabase.channel('la_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposal_rows' },
        () => { setTimeout(() => syncFromSupabase(), 1500); }
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [syncFromSupabase]);

  // ── Option label map for display ─────────────────────────────────────────────
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

  const renameColumn        = useCallback((colId: string, name: string)             => { setLaColumns(prev => prev.map(c => c.id === colId ? { ...c, name } : c)); }, []);
  const resizeColumn        = useCallback((colId: string, width: number)             => { setLaColumns(prev => prev.map(c => c.id === colId ? { ...c, width: Math.max(80, width) } : c)); }, []);
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
    syncStatus,
    statusCol,
    proposalColumns,
    forceResync: syncFromSupabase,
    addLinkedColumn, addLocalColumn,
    deleteColumn, renameColumn, resizeColumn, reorderColumns,
    updateColumnOptions, updateCell,
  };
}
