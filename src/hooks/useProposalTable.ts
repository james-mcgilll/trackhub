import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import type { Column, Row, ColumnType } from '../types/proposals';

// ── Local storage keys ────────────────────────────────────────────────────────
const LS_COLS = 'trackhub_proposal_columns_v2';
const LS_ROWS = 'trackhub_proposal_rows_v2';

// ── Helpers ───────────────────────────────────────────────────────────────────
const uid = (p = 'id') => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// Fire-and-forget Supabase call — never throws, never blocks UI
function bg(p: PromiseLike<unknown>) { Promise.resolve(p).catch(() => {}); }

function nextDisplayId(existingRows: Row[]): string {
  let max = 0;
  for (const r of existingRows) {
    const n = parseInt((r.display_id ?? '').replace('UP', ''), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return `UP${String(max + 1).padStart(3, '0')}`;
}

// ── Default seed data ─────────────────────────────────────────────────────────
const DEFAULT_COLUMNS: Column[] = [
  { id: 'col_client',  name: 'Client Name',    type: 'text',     width: 180, order: 0, options: null },
  { id: 'col_title',   name: 'Proposal Title', type: 'text',     width: 220, order: 1, options: null },
  { id: 'col_value',   name: 'Value ($)',       type: 'number',   width: 130, order: 2, options: null },
  { id: 'col_date',    name: 'Sent Date',       type: 'date',     width: 140, order: 3, options: null },
  {
    id: 'col_status', name: 'Status', type: 'dropdown', width: 150, order: 4,
    options: [
      { id: 'opt_draft',    label: 'Draft',     color: 'slate'  },
      { id: 'opt_sent',     label: 'Sent',      color: 'blue'   },
      { id: 'opt_review',   label: 'In Review', color: 'yellow' },
      { id: 'opt_accepted', label: 'Accepted',  color: 'green'  },
      { id: 'opt_rejected', label: 'Rejected',  color: 'red'    },
    ],
  },
  { id: 'col_notes', name: 'Notes', type: 'text', width: 200, order: 5, options: null },
];

const DEFAULT_ROWS: Row[] = [
  { id: 'row_1', display_id: 'UP001', data: { col_client: 'Acme Corp',        col_title: 'Website Redesign Phase 2', col_value: '45000',  col_date: '2024-12-05', col_status: 'opt_sent',     col_notes: 'Follow up Friday' }, created_at: '2024-12-01' },
  { id: 'row_2', display_id: 'UP002', data: { col_client: 'GlobalTech',       col_title: 'ERP Integration',          col_value: '120000', col_date: '2024-12-08', col_status: 'opt_review',   col_notes: 'Awaiting VP sign-off' }, created_at: '2024-12-02' },
  { id: 'row_3', display_id: 'UP003', data: { col_client: 'NovaTech',         col_title: 'Mobile App Development',   col_value: '78000',  col_date: '2024-11-28', col_status: 'opt_accepted', col_notes: 'Contract sent' }, created_at: '2024-12-03' },
  { id: 'row_4', display_id: 'UP004', data: { col_client: 'DataStream',       col_title: 'Analytics Dashboard',      col_value: '32000',  col_date: '2024-12-10', col_status: 'opt_draft',    col_notes: '' }, created_at: '2024-12-04' },
  { id: 'row_5', display_id: 'UP005', data: { col_client: 'Bright Solutions', col_title: 'Cloud Migration',          col_value: '95000',  col_date: '2024-12-01', col_status: 'opt_rejected', col_notes: 'Lost to competitor' }, created_at: '2024-12-05' },
];

// ── localStorage helpers ──────────────────────────────────────────────────────
function lsGetCols(): Column[] {
  try {
    const d = localStorage.getItem(LS_COLS);
    return d ? JSON.parse(d) : DEFAULT_COLUMNS;
  } catch { return DEFAULT_COLUMNS; }
}

function lsGetRows(): Row[] {
  try {
    const d = localStorage.getItem(LS_ROWS);
    return d ? JSON.parse(d) : DEFAULT_ROWS;
  } catch { return DEFAULT_ROWS; }
}

function lsSaveCols(cols: Column[]) {
  try { localStorage.setItem(LS_COLS, JSON.stringify(cols)); } catch { /* ignore */ }
}

function lsSaveRows(rows: Row[]) {
  try { localStorage.setItem(LS_ROWS, JSON.stringify(rows)); } catch { /* ignore */ }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useProposalTable() {
  // Load from localStorage SYNCHRONOUSLY — instant, no spinner
  const [columns, setColumns] = useState<Column[]>(lsGetCols);
  const [rows, setRows]       = useState<Row[]>(lsGetRows);
  const [loading]             = useState(false); // always false — no loading state needed

  const rowsRef      = useRef<Row[]>(rows);
  const colsRef      = useRef<Column[]>(columns);
  const localInserts = useRef<Set<string>>(new Set());
  const localDeletes = useRef<Set<string>>(new Set());

  // Keep refs in sync
  useEffect(() => { rowsRef.current = rows; }, [rows]);
  useEffect(() => { colsRef.current = columns; }, [columns]);

  // Persist to localStorage whenever state changes
  useEffect(() => { lsSaveCols(columns); }, [columns]);
  useEffect(() => { lsSaveRows(rows); }, [rows]);

  // Try Supabase — load from there if it has MORE data than localStorage
  useEffect(() => {
    (async () => {
      try {
        const [cr, rr] = await Promise.all([
          supabase.from('proposal_columns').select('*').order('order'),
          supabase.from('proposal_rows').select('*').order('created_at').limit(10000),
        ]);
        if (!cr.error && !rr.error) {
          const sbCols = cr.data as Column[];
          const sbRows = rr.data as Row[];
          // Only use Supabase data if it has rows — never overwrite local with empty
          if (sbRows.length > 0) {
            setColumns(sbCols);
            setRows(sbRows);
          } else if (sbCols.length > 0 && sbRows.length === 0) {
            // Supabase has columns but no rows — sync localStorage rows UP to Supabase
            const localRows = lsGetRows();
            if (localRows.length > 0) {
              // Push local rows to Supabase in background
              supabase.from('proposal_rows').upsert(localRows).then(() => {});
            }
          }
        }
      } catch { /* Supabase not available — localStorage is source of truth */ }
    })();

    // Realtime subscription
    const rowCh = supabase.channel('rows_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposal_rows' },
        ({ eventType, new: n, old: o }) => {
          if (eventType === 'INSERT') {
            const r = n as Row;
            if (localInserts.current.has(r.id)) { localInserts.current.delete(r.id); return; }
            setRows(prev => prev.find(x => x.id === r.id) ? prev : [...prev, r]);
          }
          if (eventType === 'UPDATE') {
            const r = n as Row;
            setRows(prev => prev.map(x => x.id === r.id ? r : x));
          }
          if (eventType === 'DELETE') {
            const r = o as Row;
            if (localDeletes.current.has(r.id)) { localDeletes.current.delete(r.id); return; }
            setRows(prev => prev.filter(x => x.id !== r.id));
          }
        }
      ).subscribe();

    const colCh = supabase.channel('cols_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposal_columns' },
        ({ eventType, new: n, old: o }) => {
          if (eventType === 'INSERT') {
            const c = n as Column;
            if (localInserts.current.has(c.id)) { localInserts.current.delete(c.id); return; }
            setColumns(prev => prev.find(x => x.id === c.id) ? prev : [...prev, c].sort((a, b) => a.order - b.order));
          }
          if (eventType === 'UPDATE') {
            const c = n as Column;
            setColumns(prev => prev.map(x => x.id === c.id ? c : x).sort((a, b) => a.order - b.order));
          }
          if (eventType === 'DELETE') {
            const c = o as Column;
            setColumns(prev => prev.filter(x => x.id !== c.id));
          }
        }
      ).subscribe();

    return () => { supabase.removeChannel(rowCh); supabase.removeChannel(colCh); };
  }, []);

  // ── Row operations — all instant via localStorage ─────────────────────────

  const addRow = useCallback(() => {
    const displayId = nextDisplayId(rowsRef.current);
    const row: Row = {
      id: uid('row'),
      display_id: displayId,
      data: {},
      created_at: new Date().toISOString(),
    };
    localInserts.current.add(row.id);
    rowsRef.current = [...rowsRef.current, row];
    setRows(prev => [...prev, row]);
    // Background sync to Supabase
    bg(supabase.from('proposal_rows').insert(row));
  }, []);

  const duplicateRow = useCallback((rowId: string) => {
    const src = rowsRef.current.find(r => r.id === rowId);
    if (!src) return;
    const displayId = nextDisplayId(rowsRef.current);
    const copy: Row = {
      id: uid('row'),
      display_id: displayId,
      data: { ...src.data },
      created_at: new Date().toISOString(),
    };
    localInserts.current.add(copy.id);
    // Update ref immediately so next duplicate gets the right next ID
    rowsRef.current = [...rowsRef.current, copy];
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === rowId);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    bg(supabase.from('proposal_rows').insert(copy));
  }, []);

  const deleteRow = useCallback((rowId: string) => {
    localDeletes.current.add(rowId);
    rowsRef.current = rowsRef.current.filter(r => r.id !== rowId);
    setRows(prev => prev.filter(r => r.id !== rowId));
    bg(supabase.from('proposal_rows').delete().eq('id', rowId));
  }, []);

  const importRows = useCallback(async (newRows: Omit<Row, 'id' | 'created_at'>[]) => {
    const toAdd: Row[] = newRows.map(r => ({
      ...r,
      id: uid('row'),
      created_at: new Date().toISOString(),
    }));
    // Update state and localStorage immediately
    rowsRef.current = [...rowsRef.current, ...toAdd];
    setRows(prev => [...prev, ...toAdd]);

    // Sync to Supabase in chunks of 500 (API limit)
    const CHUNK = 500;
    for (let i = 0; i < toAdd.length; i += CHUNK) {
      const chunk = toAdd.slice(i, i + CHUNK);
      await supabase.from('proposal_rows').upsert(chunk).then(({ error }) => {
        if (error) console.warn('Import chunk error:', error.message);
      });
    }
  }, []);

  const updateCell = useCallback((rowId: string, colId: string, value: string) => {
    const row = rowsRef.current.find(r => r.id === rowId);
    if (!row) return;
    const newData = { ...row.data, [colId]: value };
    rowsRef.current = rowsRef.current.map(r => r.id === rowId ? { ...r, data: newData } : r);
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, data: newData } : r));
    bg(supabase.from('proposal_rows').update({ data: newData }).eq('id', rowId));
  }, []);

  // ── Column operations ─────────────────────────────────────────────────────

  const addColumn = useCallback((name: string, type: ColumnType, options: { label: string; color: string }[] = []) => {
    const maxOrder = colsRef.current.length > 0 ? Math.max(...colsRef.current.map(c => c.order)) : -1;
    const opts = type === 'dropdown' ? options.map(o => ({ id: uid('opt'), ...o })) : null;
    const col: Column = { id: uid('col'), name, type, width: 160, order: maxOrder + 1, options: opts };
    localInserts.current.add(col.id);
    setColumns(prev => [...prev, col].sort((a, b) => a.order - b.order));
    bg(supabase.from('proposal_columns').insert(col));
  }, []);

  const deleteColumn = useCallback((colId: string) => {
    setColumns(prev => prev.filter(c => c.id !== colId));
    setRows(prev => prev.map(r => {
      const { [colId]: _, ...rest } = r.data;
      return { ...r, data: rest };
    }));
    bg(supabase.from('proposal_columns').delete().eq('id', colId));
  }, []);

  const renameColumn = useCallback((colId: string, name: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, name } : c));
    bg(supabase.from('proposal_columns').update({ name }).eq('id', colId));
  }, []);

  const changeColumnType = useCallback((colId: string, type: ColumnType) => {
    setColumns(prev => prev.map(c =>
      c.id === colId ? { ...c, type, options: type === 'dropdown' ? (c.options ?? []) : null } : c
    ));
    const col = colsRef.current.find(c => c.id === colId);
    bg(supabase.from('proposal_columns')
      .update({ type, options: type === 'dropdown' ? (col?.options ?? []) : null })
      .eq('id', colId));
  }, []);

  const resizeColumn = useCallback((colId: string, width: number) => {
    const w = Math.max(80, width);
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, width: w } : c));
    bg(supabase.from('proposal_columns').update({ width: w }).eq('id', colId));
  }, []);

  const reorderColumns = useCallback((sourceId: string, targetId: string, position: 'before' | 'after') => {
    if (!sourceId || !targetId || sourceId === targetId) return;
    setColumns(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const without = sorted.filter(c => c.id !== sourceId);
      const targetIdx = without.findIndex(c => c.id === targetId);
      if (targetIdx === -1) return prev;
      const insertAt = position === 'before' ? targetIdx : targetIdx + 1;
      without.splice(insertAt, 0, sorted.find(c => c.id === sourceId)!);
      const reordered = without.map((c, i) => ({ ...c, order: i }));
      reordered.forEach(c => {
        if (sorted.find(x => x.id === c.id)?.order !== c.order)
          bg(supabase.from('proposal_columns').update({ order: c.order }).eq('id', c.id));
      });
      return reordered;
    });
  }, []);

  const updateColumnOptions = useCallback((colId: string, options: Column['options']) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, options } : c));
    bg(supabase.from('proposal_columns').update({ options }).eq('id', colId));
  }, []);

  return {
    columns: [...columns].sort((a, b) => a.order - b.order),
    rows,
    loading,
    error: null,
    addRow, duplicateRow, deleteRow, updateCell, importRows,
    addColumn, deleteColumn, renameColumn, changeColumnType,
    resizeColumn, reorderColumns, updateColumnOptions,
  };
}
