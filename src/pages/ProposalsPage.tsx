import React, { useState } from 'react';
import { Plus, Columns, Download, Search } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ProposalTable } from '../components/proposals/ProposalTable';
import { AddColumnModal } from '../components/proposals/AddColumnModal';
import { useProposalTable } from '../hooks/useProposalTable';

export const ProposalsPage: React.FC = () => {
  const [showAddCol, setShowAddCol] = useState(false);
  const [search, setSearch] = useState('');

  const {
    columns, rows,
    addRow, duplicateRow, deleteRow, updateCell,
    addColumn, deleteColumn, renameColumn, changeColumnType,
    resizeColumn, moveColumn,
    addDropdownOption, updateDropdownOption, deleteDropdownOption,
  } = useProposalTable();

  // Filter rows by search across all text cells
  const filteredRows = search.trim()
    ? rows.filter(row =>
        Object.values(row.data).some(val =>
          val.toLowerCase().includes(search.toLowerCase())
        )
      )
    : rows;

  const handleAddRow = () => {
    addRow();
  };

  // CSV export helper
  const handleExport = () => {
    const headers = columns.map(c => `"${c.name}"`).join(',');
    const rowLines = rows.map(row =>
      columns.map(col => {
        let val = row.data[col.id] ?? '';
        if (col.type === 'dropdown') {
          const opt = col.options?.find(o => o.id === val);
          val = opt?.label ?? '';
        }
        return `"${val.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [headers, ...rowLines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proposals.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5 h-full max-w-screen-2xl">
      {/* Page header */}
      <PageHeader
        title="Proposal Details"
        subtitle="Manage proposal records in a flexible table view."
        actions={
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-300 transition-colors"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <Search size={14} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search rows..."
                className="text-sm text-slate-600 placeholder-slate-400 outline-none bg-transparent w-36"
              />
            </div>

            {/* Export */}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              title="Export as CSV"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Add Column */}
            <button
              onClick={() => setShowAddCol(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-colors"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              <Columns size={14} />
              <span className="hidden sm:inline">Add Column</span>
            </button>

            {/* Add Row */}
            <button
              onClick={handleAddRow}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
            >
              <Plus size={14} />
              Add Row
            </button>
          </div>
        }
      />

      {/* Stats bar */}
      <div className="flex items-center gap-5 text-sm text-slate-500">
        <span>
          <strong className="text-slate-800 font-semibold">{filteredRows.length}</strong>
          {search ? ` of ${rows.length} rows` : ' rows'}
        </span>
        <span className="text-slate-300">|</span>
        <span>
          <strong className="text-slate-800 font-semibold">{columns.length}</strong> columns
        </span>
        {search && (
          <>
            <span className="text-slate-300">|</span>
            <button
              onClick={() => setSearch('')}
              className="text-blue-600 hover:text-blue-700 text-xs font-medium"
            >
              Clear search
            </button>
          </>
        )}
        <span className="ml-auto text-xs text-slate-400 hidden md:block">
          Click any cell to edit · Hover a row for actions · Hover a column header for options
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-visible">
        <ProposalTable
          columns={columns}
          rows={filteredRows}
          onUpdateCell={updateCell}
          onDuplicateRow={duplicateRow}
          onDeleteRow={deleteRow}
          onRenameColumn={renameColumn}
          onChangeColumnType={changeColumnType}
          onDeleteColumn={deleteColumn}
          onMoveColumn={moveColumn}
          onResizeColumn={resizeColumn}
          onAddOption={addDropdownOption}
          onUpdateOption={updateDropdownOption}
          onDeleteOption={deleteDropdownOption}
        />
      </div>

      {/* Add Column Modal */}
      {showAddCol && (
        <AddColumnModal
          onAdd={(name, type) => addColumn(name, type)}
          onClose={() => setShowAddCol(false)}
        />
      )}
    </div>
  );
};
