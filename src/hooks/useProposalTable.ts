import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { seedIfEmpty } from '../utils/seedData';
import type { Column, Row, ColumnType } from '../types/proposals';

const uid = (p = 'id') => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

function nextDisplayId(rows: Row[]): string {
  let max = 0;
  for (const r of rows) {
    const n = parseInt((r.display_id ?? '').replace('UP', ''), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return `UP${String(max + 1).padStart(3, '0')}`;
}

export function useProposalTable() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const rowsRef      = useRef<Row[]>([]);
  const localInserts = useRef<Set<string>>(new Set());
  const localDeletes = useRef<Set<string>>(new Set());

  useEffect(() => { rowsRef.current = rows; }, [rows]);

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await seedIfEmpty();
        const [cr, rr] = await Promise.all([
          supabase.from('proposal_columns').select('*').order('order'),
          supabase.from('proposal_rows').select('*').order('created_at'),
        ]);
        if (cr.error) throw cr.error;
        if (rr.error) throw rr.error;
        setColumns(cr.data as Column[]);
        setRows(rr.data as Row[]);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Realtime ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const rowCh = supabase.channel('rows_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposal_rows' }, ({ eventType, new: n, old: o }) => {
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
      }).subscribe();

    const colCh = supabase.channel('cols_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposal_columns' }, ({ eventType, new: n, old: o }) => {
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
      }).subscribe();

    return () => { supabase.removeChannel(rowCh); supabase.removeChannel(colCh); };
  }, []);

  // ── Row ops ──────────────────────────────────────────────────────────────
  const addRow = useCallback(async () => {
    const row: Row = { id: uid('row'), display_id: nextDisplayId(rowsRef.current), data: {}, created_at: new Date().toISOString() };
    localInserts.current.add(row.id);
    rowsRef.current = [...rowsRef.current, row];
    setRows(prev => [...prev, row]);
    const { error } = await supabase.from('proposal_rows').insert(row);
    if (error) { setRows(prev => prev.filter(r => r.id !== row.id)); rowsRef.current = rowsRef.current.filter(r => r.id !== row.id); }
  }, []);

  const duplicateRow = useCallback(async (rowId: string) => {
    const src = rowsRef.current.find(r => r.id === rowId);
    if (!src) return;
    const copy: Row = { id: uid('row'), display_id: nextDisplayId(rowsRef.current), data: { ...src.data }, created_at: new Date().toISOString() };
    localInserts.current.add(copy.id);
    rowsRef.current = [...rowsRef.current, copy];
    setRows(prev => {
      const idx = prev.findIndex(r => r.id === rowId);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    const { error } = await supabase.from('proposal_rows').insert(copy);
    if (error) { setRows(prev => prev.filter(r => r.id !== copy.id)); rowsRef.current = rowsRef.current.filter(r => r.id !== copy.id); }
  }, []);

  const deleteRow = useCallback(async (rowId: string) => {
    const snap = rowsRef.current.find(r => r.id === rowId);
    localDeletes.current.add(rowId);
    rowsRef.current = rowsRef.current.filter(r => r.id !== rowId);
    setRows(prev => prev.filter(r => r.id !== rowId));
    const { error } = await supabase.from('proposal_rows').delete().eq('id', rowId);
    if (error && snap) { setRows(prev => [...prev, snap]); rowsRef.current = [...rowsRef.current, snap]; }
  }, []);

  const updateCell = useCallback(async (rowId: string, colId: string, value: string) => {
    const row = rowsRef.current.find(r => r.id === rowId);
    if (!row) return;
    const newData = { ...row.data, [colId]: value };
    rowsRef.current = rowsRef.current.map(r => r.id === rowId ? { ...r, data: newData } : r);
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, data: newData } : r));
    await supabase.from('proposal_rows').update({ data: newData }).eq('id', rowId);
  }, []);

  // ── Column ops ────────────────────────────────────────────────────────────
  const addColumn = useCallback(async (name: string, type: ColumnType, options: { label: string; color: string }[] = []) => {
    const maxOrder = columns.length > 0 ? Math.max(...columns.map(c => c.order)) : -1;
    const opts = type === 'dropdown' ? options.map(o => ({ id: uid('opt'), ...o })) : null;
    const col: Column = { id: uid('col'), name, type, width: 160, order: maxOrder + 1, options: opts };
    localInserts.current.add(col.id);
    setColumns(prev => [...prev, col].sort((a, b) => a.order - b.order));
    const { error } = await supabase.from('proposal_columns').insert(col);
    if (error) setColumns(prev => prev.filter(c => c.id !== col.id));
  }, [columns]);

  const deleteColumn = useCallback(async (colId: string) => {
    setColumns(prev => prev.filter(c => c.id !== colId));
    setRows(prev => prev.map(r => { const { [colId]: _, ...rest } = r.data; return { ...r, data: rest }; }));
    const { data: allRows } = await supabase.from('proposal_rows').select('*');
    if (allRows) await Promise.all((allRows as Row[]).map(r => {
      const { [colId]: _, ...rest } = r.data;
      return supabase.from('proposal_rows').update({ data: rest }).eq('id', r.id);
    }));
    await supabase.from('proposal_columns').delete().eq('id', colId);
  }, []);

  const renameColumn = useCallback(async (colId: string, name: string) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, name } : c));
    await supabase.from('proposal_columns').update({ name }).eq('id', colId);
  }, []);

  const changeColumnType = useCallback(async (colId: string, type: ColumnType) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, type, options: type === 'dropdown' ? (c.options ?? []) : null } : c));
    const col = columns.find(c => c.id === colId);
    await supabase.from('proposal_columns').update({ type, options: type === 'dropdown' ? (col?.options ?? []) : null }).eq('id', colId);
  }, [columns]);

  const resizeColumn = useCallback(async (colId: string, width: number) => {
    const w = Math.max(80, width);
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, width: w } : c));
    await supabase.from('proposal_columns').update({ width: w }).eq('id', colId);
  }, []);

  const reorderColumns = useCallback(async (sourceId: string, targetId: string, position: 'before' | 'after') => {
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
          supabase.from('proposal_columns').update({ order: c.order }).eq('id', c.id);
      });
      return reordered;
    });
  }, []);

  const updateColumnOptions = useCallback(async (colId: string, options: Column['options']) => {
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, options } : c));
    await supabase.from('proposal_columns').update({ options }).eq('id', colId);
  }, []);

  return {
    columns: [...columns].sort((a, b) => a.order - b.order),
    rows, loading, error,
    addRow, duplicateRow, deleteRow, updateCell,
    addColumn, deleteColumn, renameColumn, changeColumnType,
    resizeColumn, reorderColumns, updateColumnOptions,
  };
}
