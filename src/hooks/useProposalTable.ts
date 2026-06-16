import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { seedIfEmpty } from '../utils/seedData';
import type { Column, Row, ColumnType } from '../types/proposals';

// ─── ID helper ───────────────────────────────────────────────────────────────
const uid = (prefix = 'id') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useProposalTable() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows]       = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // ── Initial load ────────────────────────────────────────────────────────
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

  // ── Real-time subscriptions ─────────────────────────────────────────────
  useEffect(() => {
    // Subscribe to proposal_rows changes
    const rowChannel = supabase
      .channel('proposal_rows_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proposal_rows' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setRows(prev => {
              // avoid duplicates
              if (prev.find(r => r.id === (payload.new as Row).id)) return prev;
              return [...prev, payload.new as Row];
            });
          }
          if (payload.eventType === 'UPDATE') {
            setRows(prev =>
              prev.map(r => r.id === (payload.new as Row).id ? payload.new as Row : r)
            );
          }
          if (payload.eventType === 'DELETE') {
            setRows(prev => prev.filter(r => r.id !== (payload.old as Row).id));
          }
        }
      )
      .subscribe();

    // Subscribe to proposal_columns changes
    const colChannel = supabase
      .channel('proposal_columns_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proposal_columns' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setColumns(prev => {
              if (prev.find(c => c.id === (payload.new as Column).id)) return prev;
              return [...prev, payload.new as Column].sort((a, b) => a.order - b.order);
            });
          }
          if (payload.eventType === 'UPDATE') {
            setColumns(prev =>
              prev
                .map(c => c.id === (payload.new as Column).id ? payload.new as Column : c)
                .sort((a, b) => a.order - b.order)
            );
          }
          if (payload.eventType === 'DELETE') {
            setColumns(prev => prev.filter(c => c.id !== (payload.old as Column).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rowChannel);
      supabase.removeChannel(colChannel);
    };
  }, []);

  // ── Row operations ──────────────────────────────────────────────────────
  const addRow = useCallback(async () => {
    const newRow: Row = { id: uid('row'), data: {}, created_at: Date.now() };
    const { error } = await supabase.from('proposal_rows').insert(newRow);
    if (error) console.error('addRow:', error);
  }, []);

  const duplicateRow = useCallback(async (rowId: string) => {
    const src = rows.find(r => r.id === rowId);
    if (!src) return;
    const copy: Row = { id: uid('row'), data: { ...src.data }, created_at: Date.now() };
    const { error } = await supabase.from('proposal_rows').insert(copy);
    if (error) console.error('duplicateRow:', error);
  }, [rows]);

  const deleteRow = useCallback(async (rowId: string) => {
    const { error } = await supabase.from('proposal_rows').delete().eq('id', rowId);
    if (error) console.error('deleteRow:', error);
  }, []);

  const updateCell = useCallback(async (rowId: string, colId: string, value: string) => {
    const row = rows.find(r => r.id === rowId);
    if (!row) return;
    const newData = { ...row.data, [colId]: value };
    // Optimistic update locally
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, data: newData } : r));
    const { error } = await supabase
      .from('proposal_rows')
      .update({ data: newData })
      .eq('id', rowId);
    if (error) console.error('updateCell:', error);
  }, [rows]);

  // ── Column operations ───────────────────────────────────────────────────
  const addColumn = useCallback(async (name: string, type: ColumnType) => {
    const maxOrder = columns.length > 0 ? Math.max(...columns.map(c => c.order)) : -1;
    const col: Column = {
      id: uid('col'),
      name,
      type,
      width: 160,
      order: maxOrder + 1,
      options: type === 'dropdown' ? [] : null,
    };
    const { error } = await supabase.from('proposal_columns').insert(col);
    if (error) console.error('addColumn:', error);
    return col.id;
  }, [columns]);

  const deleteColumn = useCallback(async (colId: string) => {
    // Remove from all rows first
    const updatedRows = rows.map(r => {
      const { [colId]: _removed, ...rest } = r.data;
      return { ...r, data: rest };
    });
    await Promise.all(
      updatedRows.map(r =>
        supabase.from('proposal_rows').update({ data: r.data }).eq('id', r.id)
      )
    );
    const { error } = await supabase.from('proposal_columns').delete().eq('id', colId);
    if (error) console.error('deleteColumn:', error);
  }, [rows]);

  const renameColumn = useCallback(async (colId: string, name: string) => {
    const { error } = await supabase
      .from('proposal_columns').update({ name }).eq('id', colId);
    if (error) console.error('renameColumn:', error);
  }, []);

  const changeColumnType = useCallback(async (colId: string, type: ColumnType) => {
    const col = columns.find(c => c.id === colId);
    if (!col) return;
    const { error } = await supabase
      .from('proposal_columns')
      .update({ type, options: type === 'dropdown' ? (col.options ?? []) : null })
      .eq('id', colId);
    if (error) console.error('changeColumnType:', error);
  }, [columns]);

  const resizeColumn = useCallback(async (colId: string, width: number) => {
    const w = Math.max(80, width);
    // Optimistic
    setColumns(prev => prev.map(c => c.id === colId ? { ...c, width: w } : c));
    const { error } = await supabase
      .from('proposal_columns').update({ width: w }).eq('id', colId);
    if (error) console.error('resizeColumn:', error);
  }, []);

  const moveColumn = useCallback(async (colId: string, direction: 'left' | 'right') => {
    const sorted = [...columns].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex(c => c.id === colId);
    const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const colA = sorted[idx];
    const colB = sorted[swapIdx];

    await Promise.all([
      supabase.from('proposal_columns').update({ order: colB.order }).eq('id', colA.id),
      supabase.from('proposal_columns').update({ order: colA.order }).eq('id', colB.id),
    ]);
  }, [columns]);

  // ── Dropdown option operations ──────────────────────────────────────────
  const addDropdownOption = useCallback(async (colId: string, label: string, color: string) => {
    const col = columns.find(c => c.id === colId);
    if (!col) return;
    const newOpt = { id: uid('opt'), label, color };
    const newOptions = [...(col.options ?? []), newOpt];
    const { error } = await supabase
      .from('proposal_columns').update({ options: newOptions }).eq('id', colId);
    if (error) console.error('addDropdownOption:', error);
  }, [columns]);

  const updateDropdownOption = useCallback(async (
    colId: string, optId: string, label: string, color: string
  ) => {
    const col = columns.find(c => c.id === colId);
    if (!col) return;
    const newOptions = col.options?.map(o => o.id === optId ? { ...o, label, color } : o);
    const { error } = await supabase
      .from('proposal_columns').update({ options: newOptions }).eq('id', colId);
    if (error) console.error('updateDropdownOption:', error);
  }, [columns]);

  const deleteDropdownOption = useCallback(async (colId: string, optId: string) => {
    const col = columns.find(c => c.id === colId);
    if (!col) return;
    const newOptions = col.options?.filter(o => o.id !== optId);
    await supabase
      .from('proposal_columns').update({ options: newOptions }).eq('id', colId);
    // Clear cells using this option
    const affected = rows.filter(r => r.data[colId] === optId);
    await Promise.all(
      affected.map(r =>
        supabase.from('proposal_rows')
          .update({ data: { ...r.data, [colId]: '' } })
          .eq('id', r.id)
      )
    );
  }, [columns, rows]);

  return {
    columns: [...columns].sort((a, b) => a.order - b.order),
    rows,
    loading,
    error,
    // row ops
    addRow,
    duplicateRow,
    deleteRow,
    updateCell,
    // col ops
    addColumn,
    deleteColumn,
    renameColumn,
    changeColumnType,
    resizeColumn,
    moveColumn,
    setColumnWidth: resizeColumn,
    // dropdown ops
    addDropdownOption,
    updateDropdownOption,
    deleteDropdownOption,
  };
}
