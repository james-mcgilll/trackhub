import { useState, useCallback, useEffect, useMemo } from 'react';
import type { LAColumn, LARow } from '../types/leadAnalysis';
import { LA_COLUMNS_KEY, LA_ROWS_KEY, LA_QUALIFYING_STAGES } from '../types/leadAnalysis';
import type { Column, Row } from '../types/proposals';

const uid = (p = 'id') => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ── localStorage helpers ──────────────────────────────────────────────────────
function lsGet<T>(key: string, fallback: T): T {
  try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : fallback; }
  catch { return fallback; }
}
function lsSet(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ── Detect status column from proposal columns ────────────────────────────────
function detectStatusCol(cols: Column[]): Column | null {
  // 1. Try name match (broad — catches "Proposal Status", "Status", "proposal_status" etc.)
  const byName = cols.find(c =>
    c.type === 'dropdown' && (
      c.name.toLowerCase().includes('status')
    )
  );
  if (byName) return byName;
  // 2. Fallback: any dropdown whose options include at least 2 qualifying stage labels
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

  // Persist on change
  useEffect(() => { lsSet(LA_COLUMNS_KEY, laColumns); }, [laColumns]);
  useEffect(() => { lsSet(LA_ROWS_KEY,    laRows);    }, [laRows]);

  // ── Sync rows from Proposal Details ─────────────────────────────────────────
  // Rows appear when status is Contacted/Interviewed/Hired
  // Rows stay even if status changes back (we keep the LA work done)
  const statusCol = useMemo(() => detectStatusCol(proposalColumns), [proposalColumns]);

  const qualifiedUniqueIds = useMemo(() => {
    if (!statusCol) return new Set<string>();
    return new Set(
      proposalRows
        .filter(row => {
          const val = row.data[statusCol.id] ?? '';
          const opt = statusCol.options?.find(o => o.id === val);
          return opt && LA_QUALIFYING_STAGES.includes(opt.label.toLowerCase());
        })
        .map(row => row.display_id ?? '')
        .filter(Boolean)
    );
  }, [proposalRows, statusCol]);

  // Auto-add new qualifying rows, keep existing LA rows even if status changed
  useEffect(() => {
    if (qualifiedUniqueIds.size === 0) return;
    setLaRows(prev => {
      const existingIds = new Set(prev.map(r => r.uniqueId));
      const toAdd: LARow[] = [];
      for (const uid of qualifiedUniqueIds) {
        if (!existingIds.has(uid)) {
          toAdd.push({ uniqueId: uid, localData: {}, createdAt: new Date().toISOString() });
        }
      }
      if (toAdd.length === 0) return prev;
      return [...prev, ...toAdd].sort((a, b) => {
        const na = parseInt(a.uniqueId.replace('UP', ''), 10);
        const nb = parseInt(b.uniqueId.replace('UP', ''), 10);
        return nb - na; // newest first
      });
    });
  }, [qualifiedUniqueIds]);

  // ── Build merged view rows ───────────────────────────────────────────────────
  // Build a lookup: proposalColId -> { optionId -> label }
  const optionLabelMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const col of proposalColumns) {
      if (col.type === 'dropdown' && col.options) {
        map[col.id] = {};
        for (const opt of col.options) {
          map[col.id][opt.id] = opt.label;
        }
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

  // Merged view: each item has uniqueId + all column values resolved to human labels
  const mergedRows = useMemo(() => {
    return laRows.map(laRow => {
      const proposalRow = proposalRowByUniqueId[laRow.uniqueId];
      const merged: Record<string, string> = {};

      for (const col of laColumns) {
        if (col.source === 'linked' && col.linkedColId && proposalRow) {
          const rawValue = proposalRow.data[col.linkedColId] ?? '';
          // If the linked proposal column is a dropdown, resolve ID -> label
          const labelMap = optionLabelMap[col.linkedColId];
          merged[col.id] = labelMap
            ? (labelMap[rawValue] ?? rawValue)  // show label, fallback to raw if no match
            : rawValue;
        } else if (col.source === 'local') {
          merged[col.id] = laRow.localData[col.id] ?? '';
        }
      }

      // Current status from proposal (resolve option ID -> label)
      const currentStatus = proposalRow && statusCol
        ? (statusCol.options?.find(o => o.id === proposalRow.data[statusCol.id])?.label ?? '')
        : '';

      return { uniqueId: laRow.uniqueId, data: merged, currentStatus };
    });
  }, [laRows, laColumns, proposalRowByUniqueId, statusCol, optionLabelMap]);

  // ── Column operations ─────────────────────────────────────────────────────────

  const addLinkedColumn = useCallback((name: string, linkedColId: string, type: LAColumn['type']) => {
    const maxOrder = laColumns.length > 0 ? Math.max(...laColumns.map(c => c.order)) : -1;
    const col: LAColumn = {
      id: uid('lac'),
      name,
      source: 'linked',
      linkedColId,
      type,
      options: null,
      width: 180,
      order: maxOrder + 1,
    };
    setLaColumns(prev => [...prev, col].sort((a, b) => a.order - b.order));
  }, [laColumns]);

  const addLocalColumn = useCallback((
    name: string,
    type: LAColumn['type'],
    options: { label: string; color: string }[] = []
  ) => {
    const maxOrder = laColumns.length > 0 ? Math.max(...laColumns.map(c => c.order)) : -1;
    const col: LAColumn = {
      id: uid('lac'),
      name,
      source: 'local',
      type,
      options: type === 'dropdown' ? options.map(o => ({ id: uid('opt'), ...o })) : null,
      width: 180,
      order: maxOrder + 1,
    };
    setLaColumns(prev => [...prev, col].sort((a, b) => a.order - b.order));
  }, [laColumns]);

  const deleteColumn = useCallback((colId: string) => {
    setLaColumns(prev => prev.filter(c => c.id !== colId));
    // Clean up local data for deleted column
    setLaRows(prev => prev.map(r => {
      const { [colId]: _, ...rest } = r.localData;
      return { ...r, localData: rest };
    }));
  }, []);

  const renameColumn = useCallback((colId: string, name: string) => {
    setLaColumns(prev => prev.map(c => c.id === colId ? { ...c, name } : c));
  }, []);

  const resizeColumn = useCallback((colId: string, width: number) => {
    setLaColumns(prev => prev.map(c => c.id === colId ? { ...c, width: Math.max(80, width) } : c));
  }, []);

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

  const updateColumnOptions = useCallback((colId: string, options: LAColumn['options']) => {
    setLaColumns(prev => prev.map(c => c.id === colId ? { ...c, options } : c));
  }, []);

  // ── Cell update (local columns only) ─────────────────────────────────────────
  const updateCell = useCallback((uniqueId: string, colId: string, value: string) => {
    setLaRows(prev => prev.map(r =>
      r.uniqueId === uniqueId
        ? { ...r, localData: { ...r.localData, [colId]: value } }
        : r
    ));
  }, []);

  return {
    laColumns: [...laColumns].sort((a, b) => a.order - b.order),
    mergedRows,
    laRows,
    qualifiedUniqueIds,
    statusCol,          // exposed so page can show which column is being used
    proposalColumns,
    addLinkedColumn,
    addLocalColumn,
    deleteColumn,
    renameColumn,
    resizeColumn,
    reorderColumns,
    updateColumnOptions,
    updateCell,
  };
}
