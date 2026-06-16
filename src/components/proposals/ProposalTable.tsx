import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Copy, Trash2, GripVertical } from 'lucide-react';
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
  onReorderColumns: (sourceId: string, targetId: string, position: 'before' | 'after') => void;
  onResizeColumn: (colId: string, width: number) => void;
  onAddOption: (colId: string, label: string, color: string) => void;
  onUpdateOption: (colId: string, optId: string, label: string, color: string) => void;
  onDeleteOption: (colId: string, optId: string) => void;
}

const ROW_HEIGHT = 40;
const ID_COL_WIDTH = 88;
const ACTION_COL_WIDTH = 72;

export const ProposalTable: React.FC<ProposalTableProps> = ({
  columns, rows,
  onUpdateCell, onDuplicateRow, onDeleteRow,
  onRenameColumn, onChangeColumnType, onDeleteColumn,
  onReorderColumns, onResizeColumn,
  onAddOption, onUpdateOption, onDeleteOption,
}) => {
  const tableRef = useRef<HTMLDivElement>(null);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const focusCell = useCallback((rowIndex: number, colIndex: number) => {
    if (!tableRef.current) return;
    const r = Math.max(0, Math.min(rowIndex, rows.length - 1));
    const c = Math.max(0, Math.min(colIndex, columns.length - 1));
    const el = tableRef.current.querySelector<HTMLElement>(`[data-cell="${r}-${c}"]`);
    if (el) el.focus();
  }, [rows.length, columns.length]);

  const handleNavigate = useCallback((rowIndex: number, colIndex: number, rowDelta: number, colDelta: number) => {
    let newRow = rowIndex + rowDelta;
    let newCol = colIndex + colDelta;
    if (newCol < 0)               { newRow -= 1; newCol = columns.length - 1; }
    if (newCol >= columns.length) { newRow += 1; newCol = 0; }
    newRow = Math.max(0, Math.min(newRow, rows.length - 1));
    newCol = Math.max(0, Math.min(newCol, columns.length - 1));
    focusCell(newRow, newCol);
  }, [columns.length, rows.length, focusCell]);

  // ── Column resize ─────────────────────────────────────────────────────────
  const resizingRef = useRef<{ colId: string; startX: number; startW: number } | null>(null);

  const startResize = useCallback((e: React.MouseEvent, colId: string, w: number) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { colId, startX: e.clientX, startW: w };
    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      onResizeColumn(resizingRef.current.colId, resizingRef.current.startW + ev.clientX - resizingRef.current.startX);
    };
    const onUp = () => {
      resizingRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [onResizeColumn]);

  // ── Drag-and-drop column reordering ──────────────────────────────────────
  const [dragColId, setDragColId]       = useState<string | null>(null);
  const [dropTarget, setDropTarget]     = useState<{ id: string; position: 'before' | 'after' } | null>(null);
  const dragColIdRef                    = useRef<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, colId: string) => {
    dragColIdRef.current = colId;
    setDragColId(colId);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag image so our custom styling shows
    const ghost = document.createElement('div');
    ghost.style.position = 'absolute';
    ghost.style.top = '-999px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!dragColIdRef.current || dragColIdRef.current === colId) {
      setDropTarget(null);
      return;
    }
    // Determine if dropping before or after based on cursor X within the header cell
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const position: 'before' | 'after' = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
    setDropTarget({ id: colId, position });
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the table entirely (not just moving between cells)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDropTarget(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    const sourceId = dragColIdRef.current;
    if (!sourceId || sourceId === targetColId || !dropTarget) return;
    onReorderColumns(sourceId, targetColId, dropTarget.position);
    setDragColId(null);
    setDropTarget(null);
    dragColIdRef.current = null;
  }, [dropTarget, onReorderColumns]);

  const handleDragEnd = useCallback(() => {
    setDragColId(null);
    setDropTarget(null);
    dragColIdRef.current = null;
  }, []);

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDeleteClick = useCallback((rowId: string) => {
    if (pendingDelete === rowId) {
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
      setPendingDelete(null);
      onDeleteRow(rowId);
    } else {
      if (deleteTimer.current) clearTimeout(deleteTimer.current);
      setPendingDelete(rowId);
      deleteTimer.current = setTimeout(() => setPendingDelete(null), 3000);
    }
  }, [pendingDelete, onDeleteRow]);

  useEffect(() => () => { if (deleteTimer.current) clearTimeout(deleteTimer.current); }, []);

  if (columns.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 bg-white rounded-xl border border-slate-200">
        <p className="text-sm text-slate-400">No columns yet. Click <strong className="text-slate-600">Add Column</strong> to get started.</p>
      </div>
    );
  }

  return (
    <div ref={tableRef} className="overflow-x-auto rounded-xl border border-slate-200 bg-white"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <table className="border-collapse table-fixed select-none" style={{ minWidth: '100%' }}>
        <colgroup>
          <col style={{ width: ID_COL_WIDTH }} />
          {columns.map(col => <col key={col.id} style={{ width: col.width }} />)}
          <col style={{ width: ACTION_COL_WIDTH }} />
        </colgroup>

        {/* ── Header ── */}
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {/* ID column — not draggable */}
            <th className="border-r border-slate-200 text-left px-3" style={{ height: 40 }}>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">ID</span>
            </th>

            {columns.map((col, idx) => {
              const isDragging   = dragColId === col.id;
              const isDropBefore = dropTarget?.id === col.id && dropTarget.position === 'before';
              const isDropAfter  = dropTarget?.id === col.id && dropTarget.position === 'after';

              return (
                <th key={col.id}
                  draggable
                  onDragStart={e => handleDragStart(e, col.id)}
                  onDragOver={e => handleDragOver(e, col.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={e => handleDrop(e, col.id)}
                  onDragEnd={handleDragEnd}
                  className={`
                    border-r border-slate-200 text-left relative group/th transition-all duration-150
                    ${isDragging ? 'opacity-40 bg-blue-50' : ''}
                  `}
                  style={{ height: 40, width: col.width }}
                >
                  {/* Drop indicator — left edge */}
                  {isDropBefore && (
                    <div className="absolute left-0 top-0 w-0.5 h-full bg-blue-500 z-20 shadow-sm shadow-blue-300" />
                  )}
                  {/* Drop indicator — right edge */}
                  {isDropAfter && (
                    <div className="absolute right-0 top-0 w-0.5 h-full bg-blue-500 z-20 shadow-sm shadow-blue-300" />
                  )}

                  <div className="flex items-center gap-1 px-1.5 h-full overflow-hidden">
                    {/* Drag handle */}
                    <div
                      className="flex-shrink-0 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 transition-colors opacity-0 group-hover/th:opacity-100 p-0.5 rounded"
                      title="Drag to reorder"
                    >
                      <GripVertical size={13} />
                    </div>

                    <span className="text-xs font-semibold text-slate-600 truncate flex-1 select-none cursor-grab active:cursor-grabbing">
                      {col.name}
                    </span>

                    <ColHeaderMenu
                      column={col}
                      isFirst={idx === 0}
                      isLast={idx === columns.length - 1}
                      onRename={name => onRenameColumn(col.id, name)}
                      onChangeType={type => onChangeColumnType(col.id, type)}
                      onDelete={() => onDeleteColumn(col.id)}
                      onMoveLeft={() => onReorderColumns(col.id, columns[idx - 1]?.id, 'before')}
                      onMoveRight={() => onReorderColumns(col.id, columns[idx + 1]?.id, 'after')}
                      onAddOption={(label, color) => onAddOption(col.id, label, color)}
                      onUpdateOption={(optId, label, color) => onUpdateOption(col.id, optId, label, color)}
                      onDeleteOption={optId => onDeleteOption(col.id, optId)}
                    />
                  </div>

                  {/* Resize handle */}
                  <div
                    className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize z-10 opacity-0 group-hover/th:opacity-100 bg-blue-300 transition-opacity"
                    onMouseDown={e => startResize(e, col.id, col.width)}
                  />
                </th>
              );
            })}

            <th className="text-center" style={{ height: 40 }}>
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
          ) : rows.map((row, rowIdx) => (
            <tr key={row.id}
              className="border-b border-slate-100 last:border-0 hover:bg-blue-50/20 transition-colors group/row"
              style={{ height: ROW_HEIGHT }}>

              {/* ID */}
              <td className="border-r border-slate-100 px-3" style={{ width: ID_COL_WIDTH }}>
                <span className="text-xs font-mono font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md select-all" title={row.id}>
                  {row.display_id || `UP${String(rowIdx + 1).padStart(3, '0')}`}
                </span>
              </td>

              {/* Data cells */}
              {columns.map((col, colIdx) => {
                const isDraggingCol = dragColId === col.id;
                return (
                  <td key={col.id}
                    className={`border-r border-slate-100 p-0 transition-opacity ${isDraggingCol ? 'opacity-30' : ''}`}
                    style={{ width: col.width, height: ROW_HEIGHT }}>
                    <TableCell
                      column={col}
                      value={row.data[col.id] ?? ''}
                      rowId={row.id}
                      colIndex={colIdx}
                      rowIndex={rowIdx}
                      totalCols={columns.length}
                      totalRows={rows.length}
                      cellKey={`${rowIdx}-${colIdx}`}
                      onChange={val => onUpdateCell(row.id, col.id, val)}
                      onNavigate={(rd, cd) => handleNavigate(rowIdx, colIdx, rd, cd)}
                    />
                  </td>
                );
              })}

              {/* Actions */}
              <td className="text-center" style={{ width: ACTION_COL_WIDTH }}>
                <div className="flex items-center justify-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
                  <button tabIndex={-1} onClick={() => onDuplicateRow(row.id)} title="Duplicate row"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <Copy size={13} />
                  </button>
                  <div className="relative">
                    <button tabIndex={-1} onClick={() => handleDeleteClick(row.id)}
                      title={pendingDelete === row.id ? 'Click again to confirm' : 'Delete row'}
                      className={`p-1.5 rounded-lg transition-all ${
                        pendingDelete === row.id
                          ? 'text-white bg-red-500 scale-110'
                          : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                      }`}>
                      <Trash2 size={13} />
                    </button>
                    {pendingDelete === row.id && (
                      <div className="absolute bottom-full right-0 mb-1.5 bg-slate-800 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap pointer-events-none z-50 shadow-lg">
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

      {/* Drag hint */}
      {dragColId && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-full shadow-lg pointer-events-none z-50 flex items-center gap-1.5">
          <GripVertical size={12} />
          Drop to reorder column
        </div>
      )}
    </div>
  );
};
