import { useState, useCallback, useEffect } from 'react';
import type { Column, Row, ColumnType, DropdownOption, TableState } from '../types/proposals';
import { STORAGE_KEY } from '../types/proposals';

// ─── ID helpers ──────────────────────────────────────────────────────────────
const uid = (prefix = 'id') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

// ─── Default seed data ───────────────────────────────────────────────────────
const DEFAULT_COLUMNS: Column[] = [
  { id: 'col_client',   name: 'Client Name',    type: 'text',     width: 180, order: 0 },
  { id: 'col_title',    name: 'Proposal Title', type: 'text',     width: 220, order: 1 },
  { id: 'col_value',    name: 'Value ($)',       type: 'number',   width: 130, order: 2 },
  { id: 'col_date',     name: 'Sent Date',       type: 'date',     width: 140, order: 3 },
  {
    id: 'col_status', name: 'Status', type: 'dropdown', width: 140, order: 4,
    options: [
      { id: 'opt_draft',    label: 'Draft',     color: 'slate'  },
      { id: 'opt_sent',     label: 'Sent',      color: 'blue'   },
      { id: 'opt_review',   label: 'In Review', color: 'yellow' },
      { id: 'opt_accepted', label: 'Accepted',  color: 'green'  },
      { id: 'opt_rejected', label: 'Rejected',  color: 'red'    },
    ],
  },
  { id: 'col_link',   name: 'Proposal Link', type: 'link',   width: 180, order: 5 },
  { id: 'col_notes',  name: 'Notes',         type: 'text',   width: 200, order: 6 },
];

const DEFAULT_ROWS: Row[] = [
  { id: 'row_1', createdAt: Date.now(), data: { col_client: 'Acme Corp', col_title: 'Website Redesign Phase 2', col_value: '45000', col_date: '2024-12-05', col_status: 'opt_sent',     col_link: 'https://example.com/p1', col_notes: 'Follow up Friday' } },
  { id: 'row_2', createdAt: Date.now(), data: { col_client: 'GlobalTech', col_title: 'ERP Integration', col_value: '120000', col_date: '2024-12-08', col_status: 'opt_review',  col_link: '', col_notes: 'Awaiting sign-off from VP' } },
  { id: 'row_3', createdAt: Date.now(), data: { col_client: 'NovaTech',   col_title: 'Mobile App Development', col_value: '78000',  col_date: '2024-11-28', col_status: 'opt_accepted', col_link: 'https://example.com/p3', col_notes: 'Contract sent' } },
  { id: 'row_4', createdAt: Date.now(), data: { col_client: 'DataStream', col_title: 'Analytics Dashboard', col_value: '32000',  col_date: '2024-12-10', col_status: 'opt_draft',    col_link: '', col_notes: '' } },
  { id: 'row_5', createdAt: Date.now(), data: { col_client: 'Bright Solutions', col_title: 'Cloud Migration', col_value: '95000', col_date: '2024-12-01', col_status: 'opt_rejected', col_link: '', col_notes: 'Lost to competitor' } },
];

// ─── Load / Save helpers ─────────────────────────────────────────────────────
function loadState(): TableState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as TableState;
  } catch { /* ignore */ }
  return { columns: DEFAULT_COLUMNS, rows: DEFAULT_ROWS };
}

function saveState(state: TableState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ─── Hook ────────────────────────────────────────────────────────────────────
export function useProposalTable() {
  const [state, setState] = useState<TableState>(loadState);

  // Persist on every change
  useEffect(() => { saveState(state); }, [state]);

  const sortedColumns = [...state.columns].sort((a, b) => a.order - b.order);

  // ── Row operations ──────────────────────────────────────────────────────
  const addRow = useCallback(() => {
    const newRow: Row = { id: uid('row'), createdAt: Date.now(), data: {} };
    setState(s => ({ ...s, rows: [...s.rows, newRow] }));
    return newRow.id;
  }, []);

  const duplicateRow = useCallback((rowId: string) => {
    setState(s => {
      const src = s.rows.find(r => r.id === rowId);
      if (!src) return s;
      const copy: Row = { id: uid('row'), createdAt: Date.now(), data: { ...src.data } };
      const idx = s.rows.findIndex(r => r.id === rowId);
      const rows = [...s.rows];
      rows.splice(idx + 1, 0, copy);
      return { ...s, rows };
    });
  }, []);

  const deleteRow = useCallback((rowId: string) => {
    setState(s => ({ ...s, rows: s.rows.filter(r => r.id !== rowId) }));
  }, []);

  const updateCell = useCallback((rowId: string, colId: string, value: string) => {
    setState(s => ({
      ...s,
      rows: s.rows.map(r =>
        r.id === rowId ? { ...r, data: { ...r.data, [colId]: value } } : r
      ),
    }));
  }, []);

  // ── Column operations ───────────────────────────────────────────────────
  const addColumn = useCallback((name: string, type: ColumnType) => {
    const maxOrder = Math.max(-1, ...state.columns.map(c => c.order));
    const col: Column = {
      id: uid('col'),
      name,
      type,
      width: 160,
      order: maxOrder + 1,
      options: type === 'dropdown' ? [] : undefined,
    };
    setState(s => ({ ...s, columns: [...s.columns, col] }));
    return col.id;
  }, [state.columns]);

  const deleteColumn = useCallback((colId: string) => {
    setState(s => ({
      columns: s.columns.filter(c => c.id !== colId),
      rows: s.rows.map(r => {
        const { [colId]: _removed, ...rest } = r.data;
        return { ...r, data: rest };
      }),
    }));
  }, []);

  const renameColumn = useCallback((colId: string, name: string) => {
    setState(s => ({
      ...s,
      columns: s.columns.map(c => c.id === colId ? { ...c, name } : c),
    }));
  }, []);

  const changeColumnType = useCallback((colId: string, type: ColumnType) => {
    setState(s => ({
      ...s,
      columns: s.columns.map(c =>
        c.id === colId
          ? { ...c, type, options: type === 'dropdown' ? (c.options ?? []) : undefined }
          : c
      ),
    }));
  }, []);

  const resizeColumn = useCallback((colId: string, width: number) => {
    setState(s => ({
      ...s,
      columns: s.columns.map(c => c.id === colId ? { ...c, width: Math.max(80, width) } : c),
    }));
  }, []);

  const moveColumn = useCallback((colId: string, direction: 'left' | 'right') => {
    setState(s => {
      const sorted = [...s.columns].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex(c => c.id === colId);
      const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return s;
      const newCols = s.columns.map(c => {
        if (c.id === sorted[idx].id)    return { ...c, order: sorted[swapIdx].order };
        if (c.id === sorted[swapIdx].id) return { ...c, order: sorted[idx].order };
        return c;
      });
      return { ...s, columns: newCols };
    });
  }, []);

  // ── Dropdown option operations ──────────────────────────────────────────
  const addDropdownOption = useCallback((colId: string, label: string, color: string) => {
    const opt: DropdownOption = { id: uid('opt'), label, color };
    setState(s => ({
      ...s,
      columns: s.columns.map(c =>
        c.id === colId ? { ...c, options: [...(c.options ?? []), opt] } : c
      ),
    }));
  }, []);

  const updateDropdownOption = useCallback((colId: string, optId: string, label: string, color: string) => {
    setState(s => ({
      ...s,
      columns: s.columns.map(c =>
        c.id === colId
          ? { ...c, options: c.options?.map(o => o.id === optId ? { ...o, label, color } : o) }
          : c
      ),
    }));
  }, []);

  const deleteDropdownOption = useCallback((colId: string, optId: string) => {
    setState(s => ({
      ...s,
      columns: s.columns.map(c =>
        c.id === colId ? { ...c, options: c.options?.filter(o => o.id !== optId) } : c
      ),
      // Clear cells that used this option
      rows: s.rows.map(r =>
        r.data[colId] === optId ? { ...r, data: { ...r.data, [colId]: '' } } : r
      ),
    }));
  }, []);

  const setColumnWidth = useCallback((colId: string, width: number) => {
    resizeColumn(colId, width);
  }, [resizeColumn]);

  return {
    columns: sortedColumns,
    rows: state.rows,
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
    setColumnWidth,
    // dropdown ops
    addDropdownOption,
    updateDropdownOption,
    deleteDropdownOption,
  };
}
