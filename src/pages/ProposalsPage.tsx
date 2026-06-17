import React, { useState } from 'react';
import { Plus, Columns, Download, Search, Loader2, AlertCircle, Wifi } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ProposalTable } from '../components/proposals/ProposalTable';
import { AddColumnModal } from '../components/proposals/AddColumnModal';
import { useProposalTable } from '../hooks/useProposalTable';
import type { ColumnType } from '../types/proposals';

export const ProposalsPage: React.FC = () => {
  const [showAddCol, setShowAddCol] = useState(false);
  const [search, setSearch] = useState('');

  const {
    columns, rows, loading, error,
    addRow, duplicateRow, deleteRow, updateCell,
    addColumn, deleteColumn, renameColumn, changeColumnType,
    resizeColumn, reorderColumns, updateColumnOptions,
  } = useProposalTable();

  // Duplicate column helper
  const duplicateColumn = (colId: string) => {
    const src = columns.find(c => c.id === colId);
    if (!src) return;
    addColumn(`${src.name} (copy)`, src.type as ColumnType, src.options?.map(o => ({ label: o.label, color: o.color })) ?? []);
  };

  // Move left/right helpers
  const moveLeft = (colId: string) => {
    const i = columns.findIndex(c => c.id === colId);
    if (i > 0) reorderColumns(colId, columns[i - 1].id, 'before');
  };
  const moveRight = (colId: string) => {
    const i = columns.findIndex(c => c.id === colId);
    if (i < columns.length - 1) reorderColumns(colId, columns[i + 1].id, 'after');
  };

  const filteredRows = search.trim()
    ? rows.filter(row => Object.values(row.data).some(v => String(v).toLowerCase().includes(search.toLowerCase())))
    : rows;

  const handleExport = () => {
    const headers = columns.map(c => `"${c.name}"`).join(',');
    const lines = rows.map(row =>
      columns.map(col => {
        let v = row.data[col.id] ?? '';
        if (col.type === 'dropdown') v = col.options?.find(o => o.id === v)?.label ?? '';
        return `"${v.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [headers, ...lines].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'proposals.csv';
    a.click();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 size={28} className="text-blue-500 animate-spin" />
      <p className="text-sm text-slate-500">Loading proposals...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <AlertCircle size={28} className="text-red-400" />
      <p className="text-sm text-slate-600 font-medium">Failed to load</p>
      <p className="text-xs text-slate-400">{error}</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700">Retry</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 max-w-screen-2xl">
      <PageHeader
        title="Proposal Details"
        subtitle="Manage proposal records in a flexible table view."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl">
              <Wifi size={12} className="text-emerald-500" />
              <span className="text-xs font-medium text-emerald-600">Live sync</span>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-300 transition-colors" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <Search size={14} className="text-slate-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search..." className="text-sm text-slate-600 placeholder-slate-400 outline-none bg-transparent w-32" />
            </div>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <Download size={14} /><span className="hidden sm:inline">Export</span>
            </button>
            <button onClick={() => setShowAddCol(true)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <Columns size={14} /><span className="hidden sm:inline">Add Column</span>
            </button>
            <button onClick={addRow} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
              <Plus size={14} />Add Row
            </button>
          </div>
        }
      />

      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span><strong className="text-slate-800 font-semibold">{filteredRows.length}</strong>{search ? ` of ${rows.length} rows` : ' rows'}</span>
        <span className="text-slate-300">|</span>
        <span><strong className="text-slate-800 font-semibold">{columns.length}</strong> columns</span>
        {search && <button onClick={() => setSearch('')} className="text-blue-600 text-xs font-medium">Clear</button>}
        <span className="ml-auto text-xs text-slate-400 hidden md:block">
          Double-click a column name to rename · Right-click a column header for options · Drag ⠿ to reorder
        </span>
      </div>

      <ProposalTable
        columns={columns}
        rows={filteredRows}
        onUpdateCell={updateCell}
        onDuplicateRow={duplicateRow}
        onDeleteRow={deleteRow}
        onRenameColumn={renameColumn}
        onChangeColumnType={changeColumnType}
        onDeleteColumn={deleteColumn}
        onDuplicateColumn={duplicateColumn}
        onReorderColumns={reorderColumns}
        onResizeColumn={resizeColumn}
        onMoveLeft={moveLeft}
        onMoveRight={moveRight}
        onUpdateColumnOptions={(colId, opts) => updateColumnOptions(colId, opts)}
      />

      {showAddCol && (
        <AddColumnModal
          onAdd={(name, type, opts) => addColumn(name, type, opts)}
          onClose={() => setShowAddCol(false)}
        />
      )}
    </div>
  );
};
