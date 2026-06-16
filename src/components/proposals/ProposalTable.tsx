import React, { useRef, useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import type { Column, Row } from '../../types/proposals';
import { TableCell } from './TableCell';
import { ColHeaderMenu } from './ColHeaderMenu';
import type { ColumnType } from '../../types/proposals';

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

const ROW_HEIGHT = 38;
const ACTION_COL_WIDTH = 76;

export const ProposalTable: React.FC<ProposalTableProps> = ({
  columns, rows,
  onUpdateCell, onDuplicateRow, onDeleteRow,
  onRenameColumn, onChangeColumnType, onDeleteColumn, onMoveColumn, onResizeColumn,
  onAddOption, onUpdateOption, onDeleteOption,
}) => {
  // ── Column resize drag ───────────────────────────────────────────────────
  const resizingRef = useRef<{ colId: string; startX: number; startWidth: number } | null>(null);

  const startResize = (e: React.MouseEvent, colId: string, currentWidth: number) => {
    e.preventDefault();
    resizingRef.current = { colId, startX: e.clientX, startWidth: currentWidth };

    const onMouseMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizingRef.current.startX;
      const newW = Math.max(80, resizingRef.current.startWidth + delta);
      onResizeColumn(resizingRef.current.colId, newW);
    };

    const onMouseUp = () => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // ── Row number column width ──────────────────────────────────────────────
  const rowNumWidth = 40;

  // ── Confirm delete ───────────────────────────────────────────────────────
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<string | null>(null);
  const [confirmDeleteCol, setConfirmDeleteCol] = useState<string | null>(null);

  const handleDeleteRow = (rowId: string) => {
    if (confirmDeleteRow === rowId) { onDeleteRow(rowId); setConfirmDeleteRow(null); }
    else { setConfirmDeleteRow(rowId); setTimeout(() => setConfirmDeleteRow(null), 2500); }
  };

  const handleDeleteCol = (colId: string) => {
    if (confirmDeleteCol === colId) { onDeleteColumn(colId); setConfirmDeleteCol(null); }
    else { setConfirmDeleteCol(colId); setTimeout(() => setConfirmDeleteCol(null), 2500); }
  };

  if (columns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-slate-400 text-sm">No columns yet. Click <strong>Add Column</strong> to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overflow-y-visible rounded-xl border border-slate-200"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <table className="border-collapse table-fixed bg-white" style={{ minWidth: '100%' }}>
        <colgroup>
          {/* Row # */}
          <col style={{ width: rowNumWidth }} />
          {columns.map(col => (
            <col key={col.id} style={{ width: col.width }} />
          ))}
          {/* Actions */}
          <col style={{ width: ACTION_COL_WIDTH }} />
        </colgroup>

        {/* ── Header ── */}
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {/* Row # header */}
            <th className="border-r border-slate-200 text-center" style={{ height: 40, width: rowNumWidth }}>
              <span className="text-xs text-slate-400 font-medium">#</span>
            </th>

            {columns.map((col, idx) => (
              <th
                key={col.id}
                className="border-r border-slate-200 text-left relative group"
                style={{ height: 40, width: col.width }}
              >
                <div className="flex items-center gap-1 px-2.5 h-full">
                  <span className="text-xs font-semibold text-slate-600 truncate flex-1 select-none">
                    {col.name}
                  </span>
                  <ColHeaderMenu
                    column={col}
                    isFirst={idx === 0}
                    isLast={idx === columns.length - 1}
                    onRename={name => onRenameColumn(col.id, name)}
                    onChangeType={type => onChangeColumnType(col.id, type)}
                    onDelete={() => handleDeleteCol(col.id)}
                    onMoveLeft={() => onMoveColumn(col.id, 'left')}
                    onMoveRight={() => onMoveColumn(col.id, 'right')}
                    onAddOption={(label, color) => onAddOption(col.id, label, color)}
                    onUpdateOption={(optId, label, color) => onUpdateOption(col.id, optId, label, color)}
                    onDeleteOption={optId => onDeleteOption(col.id, optId)}
                  />
                </div>
                {/* Resize handle */}
                <div
                  className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-blue-400 hover:opacity-50 transition-opacity z-10 group-hover:opacity-100 opacity-0"
                  onMouseDown={e => startResize(e, col.id, col.width)}
                />
                {/* Delete confirm flash */}
                {confirmDeleteCol === col.id && (
                  <div className="absolute top-full left-0 mt-1 z-50 bg-red-500 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap shadow-lg">
                    Click again to delete
                  </div>
                )}
              </th>
            ))}

            {/* Actions header */}
            <th className="text-center" style={{ height: 40, width: ACTION_COL_WIDTH }}>
              <span className="text-xs text-slate-400 font-medium">Actions</span>
            </th>
          </tr>
        </thead>

        {/* ── Body ── */}
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length + 2} className="text-center py-12 text-sm text-slate-400">
                No rows yet. Click <strong className="text-slate-600">Add Row</strong> to add your first record.
              </td>
            </tr>
          )}
          {rows.map((row, rowIdx) => (
            <tr
              key={row.id}
              className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors group/row"
              style={{ height: ROW_HEIGHT }}
            >
              {/* Row number */}
              <td className="border-r border-slate-100 text-center" style={{ width: rowNumWidth }}>
                <span className="text-xs text-slate-400 font-medium tabular-nums">{rowIdx + 1}</span>
              </td>

              {columns.map(col => (
                <td
                  key={col.id}
                  className="border-r border-slate-100 p-0 relative"
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
                  <button
                    onClick={() => onDuplicateRow(row.id)}
                    title="Duplicate row"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    onClick={() => handleDeleteRow(row.id)}
                    title={confirmDeleteRow === row.id ? 'Click to confirm' : 'Delete row'}
                    className={`p-1.5 rounded-lg transition-colors ${
                      confirmDeleteRow === row.id
                        ? 'text-white bg-red-500 hover:bg-red-600'
                        : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                    }`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
