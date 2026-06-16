import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabase';
import { seedIfEmpty } from '../utils/seedData';
import type { Column, Row, ColumnType } from '../types/proposals';

const uid = (prefix = 'id') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

export function useProposalTable() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Track IDs we inserted/deleted locally so realtime echo doesn't double-apply
  const localInserts = useRef<Set<string>>(new Set());
  const localDeletes = useRef<Set<string>>(new Set());

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        await seedIfEmpty();
        const [colRes, rowRes] = await Promise.all([
          supabase.from('proposal_columns').select('*').order('order'),
          supabase.from('proposal_rows').select('*').order('created_at'),
        ]);
        if (colRes.error) throw colRes.error;
        if (rowRes.error) throw rowRes.error;
        setColumns(colRes.data as Column[]);
        setRows(rowRes.data as Row[]);
      } catch (e: any) {
        setError(e.message ?? 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Real-time subscriptions ───────────────────────────────────────────────
  useEffect(() => {
    const rowChannel = supabase
      .channel('proposal_rows_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposal_rows' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const r = payload.new as Row;
          if (localInserts.current.has(r.id)) { localInserts.current.delete(r.id); return; }
          setRows(prev => prev.find(x => x.id === r.id) ? prev : [...prev, r]);
        }
        if (payload.eventType === 'UPDATE') {
          const r = payload.new as Row;
          setRows(prev => prev.map(x => x.id === r.id ? r : x));
        }
        if (payload.eventType === 'DELETE') {
          const r = payload.old as Row;
          if (localDeletes.current.has(r.id)) { localDeletes.current.delete(r.id); return; }
          setRows(prev => prev.filter(x => x.id !== r.id));
        }
      })
      .subscribe();

    const colChannel = supabase
      .channel('proposal_columns_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposal_columns' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const c = payload.new as Column;
          if (localInserts.current.has(c.id)) { localInserts.current.delete(c.id); return; }
          setColumns(prev => prev.find(x => x.id === c.id) ? prev : [...prev, c].sort((a, b) => a.order - b.order));
        }
        if (payload.eventType === 'UPDATE') {
          const c = payload.new as Column;
          setColumns(prev => prev.map(x => x.id === c.id ? c : x).sort((a, b) => a.order - b.order));
        }
        if (payload.eventType === 'DELETE') {
          const c = payload.old as Column;
          setColumns(prev => prev.filter(x => x.id !== c.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(rowChannel);
      supabase.removeChannel(colChannel);
    };
  }, []);

  // ── Row operations — optimistic first ────────────────────────────────────

  const addRow = useCallback(async () => {
    const newRow: Row = { id: uid('row'), data: {}, created_at: new Date().toISOString() };
    localInserts.current.add(newRow.id);
    setRows(prev => [...prev, newRow]);
    const { error } = await supabase.from('proposal_rows').insert(newRow);
    if (error) { setRows(prev => prev.filter(r => r.id !== newRow.id)); }
  }, []);

  const duplicateRow = useCallback(async (rowId: string) => {
    setRows(prev => {
      const src = prev.find(r => r.id === rowId);
      if (!src) return prev;
      const copy: Row = { id: uid('row'), data: { ...src.data }, created_at: new Date().toISOString() };
      localInserts.current.add(copy.id);
      supabase.from('proposal_rows').insert(copy).then(({ error }) => {
        if (error) setRows(p => p.filter(r => r.id !== copy.id));
      });
      const idx = prev.findIndex(r => r.id === rowId);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);

  const deleteRow = useCallback(async (rowId: string) => {
    localDeletes.current.add(rowId);
    setRows(prev => prev.filter(r => r.id !== rowId));
    const { error } = await supabase.from('proposal_rows').delete().eq('id', rowId);
    if (error) {
      // rollback
      const { data } = await supabase.from('proposal_rows').select('*').eq('id', rowId).single();
      if (data) setRows(prev => [...prev, data as Row]);
    }
  }, []);

  const updateCell = useCallback(async (rowId: string, colId: string, value: string) => {
    // Optimistic
    let mergedData: Record<string, string> = {};
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      mergedData = { ...r.data, [colId]: value };
      return { ...r, data: mergedData };
    }));
    await supabase.from('proposal_rows').update({ data: mergedData }).eq('id', rowId);
  }, []);

  // ── Column operations — optimistic first ─────────────────────────────────

  const addColumn = useCallback(async (name: string, type: ColumnType) => {
    const maxOrder = columns.length > 0 ? Math.max(...columns.map(c => c.order)) : -1;
    const col: Column = { id: uid('col'), name, type, width: 160, order: maxOrder + 1, options: type === 'dropdown' ? [] : null };
    localInserts.current.add(col.id);
    setColumns(prev => [...prev, col].sort((a, b) => a.order - b.order));
    const { error } = await supabase.from('proposal_columns').insert(col);
    if (error) setColumns(prev => prev.filter(c => c.id !== col.id));
    return col.id;
  }, [columns]);

  const deleteColumn = useCallback(async (colId: string) => {
    setColumns(prev => prev.filter(c => c.id !== colId));
    setRows(prev => prev.map(r => { const { [colId]: _, ...rest } = r.data; return { ...r, data: rest }; }));
    // sync all rows then delete col
    const { data: allRows } = await supabase.from('proposal_rows').select('*');
    if (allRows) {
      await Promise.all((allRows as Row[]).map(r => {
        const { [colId]: _, ...rest } = r.data;
        return supabase.from('proposal_rows').update({ data: rest }).eq('id', r.id);
      }));
    }
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

  const moveColumn = useCallback(async (colId: string, direction: 'left' | 'right') => {
    setColumns(prev => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex(c => c.id === colId);
      const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return prev;
      const [a, b] = [sorted[idx], sorted[swapIdx]];
      Promise.all([
        supabase.from('proposal_columns').update({ order: b.order }).eq('id', a.id),
        supabase.from('proposal_columns').update({ order: a.order }).eq('id', b.id),
      ]);
      return prev.map(c => {
        if (c.id === a.id) return { ...c, order: b.order };
        if (c.id === b.id) return { ...c, order: a.order };
        return c;
      }).sort((a, b) => a.order - b.order);
    });
  }, []);

  // ── Dropdown operations ───────────────────────────────────────────────────

  const addDropdownOption = useCallback(async (colId: string, label: string, color: string) => {
    const newOpt = { id: uid('opt'), label, color };
    let newOptions: typeof newOpt[] = [];
    setColumns(prev => prev.map(c => {
      if (c.id !== colId) return c;
      newOptions = [...(c.options ?? []), newOpt];
      return { ...c, options: newOptions };
    }));
    await supabase.from('proposal_columns').update({ options: newOptions }).eq('id', colId);
  }, []);

  const updateDropdownOption = useCallback(async (colId: string, optId: string, label: string, color: string) => {
    let newOptions: any[] = [];
    setColumns(prev => prev.map(c => {
      if (c.id !== colId) return c;
      newOptions = (c.options ?? []).map(o => o.id === optId ? { ...o, label, color } : o);
      return { ...c, options: newOptions };
    }));
    await supabase.from('proposal_columns').update({ options: newOptions }).eq('id', colId);
  }, []);

  const deleteDropdownOption = useCallback(async (colId: string, optId: string) => {
    let newOptions: any[] = [];
    setColumns(prev => prev.map(c => {
      if (c.id !== colId) return c;
      newOptions = (c.options ?? []).filter(o => o.id !== optId);
      return { ...c, options: newOptions };
    }));
    setRows(prev => prev.map(r =>
      r.data[colId] === optId ? { ...r, data: { ...r.data, [colId]: '' } } : r
    ));
    await supabase.from('proposal_columns').update({ options: newOptions }).eq('id', colId);
    const affected = rows.filter(r => r.data[colId] === optId);
    await Promise.all(affected.map(r =>
      supabase.from('proposal_rows').update({ data: { ...r.data, [colId]: '' } }).eq('id', r.id)
    ));
  }, [rows]);

  return {
    columns: [...columns].sort((a, b) => a.order - b.order),
    rows, loading, error,
    addRow, duplicateRow, deleteRow, updateCell,
    addColumn, deleteColumn, renameColumn, changeColumnType,
    resizeColumn, moveColumn, setColumnWidth: resizeColumn,
    addDropdownOption, updateDropdownOption, deleteDropdownOption,
  };
}
