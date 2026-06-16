import React, { useRef, useState, useCallback } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import type { Column, Row, ColumnType } from '../../types/proposals';
import { TableCell } from './TableCell';
import { ColHeaderMenu } from './ColHeaderMenu';

interface ProposalTableProps {
  columns: Column[];
  rows: Row[];
  onUpdateCell: (rowId: string, colId: string, value: string) => void;
  onDuplicateRow: (rowId: string) => void;
  onDeleteRow: (rowId: string) => void;
  onRenameColumn: (colId: string, name: string) => void;
  onChangeColumnType: (colId: string, type: ColumnType) => void;
  onDeleteColumn: (colId: string) => void;
  onMoveColumn: (colId: string, dir: 'left' | 'right') => void;
  onResizeColumn: (colId: string, width: number) => void;
  onAddOption: (colId: string, label: string, color: string) => void;
  onUpdateOption: (colId: string, optId: string, label: string, color: string) => void;
  onDeleteOption: (colId: string, optId: string) => void;
}

const ROW_HEIGHT = 40;
const ID_COL_WIDTH = 90;
const ACTION_COL_WIDTH = 72;

// Short display ID from the full row id
const shortId = (id: string) => {
  const parts = id.split('_');
  const raw = parts[parts.length - 1] ?? id;
  return raw.slice(0, 6).toUpperCase();
};

export const ProposalTable: React.FC<ProposalTableProps> = ({
  columns, rows,
  onUpdateCell, onDuplicateRow, onDeleteRow,
  onRenameColumn, onChangeColumnType, onDeleteColumn, onMoveColumn, onResizeColumn,
  onAddOption, onUpdateOption, onDeleteOption,
}) => {
  // ── Column resize ────────────────────────────────────────────────────────
  const resizingRef = useRef<{ colId: string; startX: number; startWidth: number } | null>(null);

  const startResize = useCallback((e: React.MouseEvent, colId: string, currentWidth: number) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { colId, startX: e.clientX, startWidth: currentWidth };

    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      onResizeColumn(resizingRef.current.colId, resizingRef.current.startWidth + ev.clientX - resizingRef.current.startX);
    };
    const onUp = () => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [onResizeColumn]);

  // ── Delete confirmation per-row (tooltip style, single confirm) ──────────
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDeleteClick = useCallback((rowId: string) => {
    if (pendingDelete === rowId) {
      // Second click — confirmed
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      setPendingDelete(null);
      onDeleteRow(rowId);
    } else {
      // First click — arm it
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      setPendingDelete(rowId);
      deleteTimerRef.current = setTimeout(() => setPendingDelete(null), 3000);
    }
  }, [pendingDelete, onDeleteRow]);

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
        <p className="text-sm text-slate-400">No columns yet. Click <strong className="text-slate-600">Add Column</strong> to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <table className="border-collapse table-fixed" style={{ minWidth: '100%' }}>
        <colgroup>
          <col style={{ width: ID_COL_WIDTH, minWidth: ID_COL_WIDTH }} />
          {columns.map(col => <col key={col.id} style={{ width: col.width, minWidth: col.width }} />)}
          <col style={{ width: ACTION_COL_WIDTH, minWidth: ACTION_COL_WIDTH }} />
        </colgroup>

        {/* ── Header ── */}
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {/* ID column header */}
            <th className="border-r border-slate-200 text-left px-3" style={{ height: 40, width: ID_COL_WIDTH }}>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">ID</span>
            </th>

            {columns.map((col, idx) => (
              <th key={col.id}
                className="border-r border-slate-200 text-left relative group/th"
                style={{ height: 40, width: col.width }}
              >
                <div className="flex items-center gap-1 px-2.5 h-full overflow-hidden">
                  <span className="text-xs font-semibold text-slate-600 truncate flex-1 select-none">
                    {col.name}
                  </span>
                  <div className="flex-shrink-0">
                    <ColHeaderMenu
                      column={col}
                      isFirst={idx === 0}
                      isLast={idx === columns.length - 1}
                      onRename={name => onRenameColumn(col.id, name)}
                      onChangeType={type => onChangeColumnType(col.id, type)}
                      onDelete={() => onDeleteColumn(col.id)}
                      onMoveLeft={() => onMoveColumn(col.id, 'left')}
                      onMoveRight={() => onMoveColumn(col.id, 'right')}
                      onAddOption={(label, color) => onAddOption(col.id, label, color)}
                      onUpdateOption={(optId, label, color) => onUpdateOption(col.id, optId, label, color)}
                      onDeleteOption={optId => onDeleteOption(col.id, optId)}
                    />
                  </div>
                </div>
                {/* Resize handle */}
                <div
                  className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize z-10 group-hover/th:bg-blue-300 group-hover/th:opacity-40 transition-opacity"
                  onMouseDown={e => startResize(e, col.id, col.width)}
                />
              </th>
            ))}

            {/* Actions header */}
            <th className="text-center" style={{ height: 40, width: ACTION_COL_WIDTH }}>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Actions</span>
            </th>
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 2} className="text-center py-14 text-sm text-slate-400">
                No rows yet — click <strong className="text-slate-600">Add Row</strong> to get started.
              </td>
            </tr>
          ) : rows.map(row => (
            <tr
              key={row.id}
              className="border-b border-slate-100 last:border-0 hover:bg-blue-50/30 transition-colors group/row"
              style={{ height: ROW_HEIGHT }}
            >
              {/* Unique ID cell */}
              <td className="border-r border-slate-100 px-3" style={{ width: ID_COL_WIDTH }}>
                <span
                  className="text-xs font-mono font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded select-all"
                  title={row.id}
                >
                  {shortId(row.id)}
                </span>
              </td>

              {/* Data cells */}
              {columns.map(col => (
                <td key={col.id}
                  className="border-r border-slate-100 p-0"
                  style={{ width: col.width, maxWidth: col.width, height: ROW_HEIGHT }}
                >
                  <TableCell
                    column={col}
                    value={row.data[col.id] ?? ''}
                    onChange={val => onUpdateCell(row.id, col.id, val)}
                  />
                </td>
              ))}

              {/* Actions */}
              <td className="text-center" style={{ width: ACTION_COL_WIDTH }}>
                <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                  {/* Duplicate */}
                  <button
                    onClick={() => onDuplicateRow(row.id)}
                    title="Duplicate row"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Copy size={13} />
                  </button>

                  {/* Delete — single click with tooltip confirm */}
                  <div className="relative">
                    <button
                      onClick={() => handleDeleteClick(row.id)}
                      title={pendingDelete === row.id ? 'Click again to confirm' : 'Delete row'}
                      className={`p-1.5 rounded-lg transition-all ${
                        pendingDelete === row.id
                          ? 'text-white bg-red-500 scale-110'
                          : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                      }`}
                    >
                      <Trash2 size={13} />
                    </button>
                    {pendingDelete === row.id && (
                      <div className="absolute bottom-full right-0 mb-1.5 bg-slate-800 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none z-50">
                        Click again to delete
                        <div className="absolute top-full right-2 border-4 border-transparent border-t-slate-800" />
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
