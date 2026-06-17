import React, { useState } from 'react';
import { Plus, Columns, Download, Search, Wifi, Upload, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ProposalTable } from '../components/proposals/ProposalTable';
import { AddColumnModal } from '../components/proposals/AddColumnModal';
import { ImportModal } from '../components/proposals/ImportModal';
import { FunnelCards } from '../components/proposals/FunnelCards';
import { useProposalTable } from '../hooks/useProposalTable';
import type { ColumnType, Row } from '../types/proposals';

const ROWS_PER_PAGE = 100;

export const ProposalsPage: React.FC = () => {
  const [showAddCol,  setShowAddCol]  = useState(false);
  const [showImport,  setShowImport]  = useState(false);
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [funnelFilter, setFunnelFilter] = useState<string | null>(null);

  const {
    columns, rows, loading, error,
    addRow, duplicateRow, deleteRow, updateCell, importRows, clearAllRows,
    addColumn, deleteColumn, renameColumn, changeColumnType,
    resizeColumn, reorderColumns, updateColumnOptions,
  } = useProposalTable();

  const duplicateColumn = (colId: string) => {
    const src = columns.find(c => c.id === colId);
    if (!src) return;
    addColumn(`${src.name} (copy)`, src.type as ColumnType, src.options?.map(o => ({ label: o.label, color: o.color })) ?? []);
  };

  const moveLeft = (colId: string) => {
    const i = columns.findIndex(c => c.id === colId);
    if (i > 0) reorderColumns(colId, columns[i - 1].id, 'before');
  };

  const moveRight = (colId: string) => {
    const i = columns.findIndex(c => c.id === colId);
    if (i < columns.length - 1) reorderColumns(colId, columns[i + 1].id, 'after');
  };

  // Funnel stage order for cumulative filtering
  const FUNNEL_ORDER = ['submitted', 'viewed', 'contacted', 'interviewed', 'hired'];

  // Find the status column
  const statusCol = columns.find(c =>
    c.type === 'dropdown' && (
      c.name.toLowerCase().includes('proposal status') ||
      c.name.toLowerCase() === 'status'
    )
  ) ?? columns.find(c => {
    if (c.type !== 'dropdown' || !c.options) return false;
    return c.options.filter(o => FUNNEL_ORDER.includes(o.label.toLowerCase())).length >= 2;
  }) ?? null;

  // Get min stage index for the active funnel filter
  const funnelMinStage = (() => {
    if (!funnelFilter || !statusCol?.options) return -1;
    const opt = statusCol.options.find(o => o.id === funnelFilter);
    if (!opt) return -1;
    return FUNNEL_ORDER.indexOf(opt.label.toLowerCase());
  })();

  // Filter rows by search + funnel
  const filteredRows = rows.filter(row => {
    // Search filter
    if (search.trim()) {
      const matchesSearch =
        row.display_id?.toLowerCase().includes(search.toLowerCase()) ||
        Object.values(row.data).some(v => String(v).toLowerCase().includes(search.toLowerCase()));
      if (!matchesSearch) return false;
    }
    // Funnel filter — show rows at this stage OR ANY LATER STAGE
    // e.g. clicking "Viewed" shows Viewed + Contacted + Interviewed + Hired
    // clicking "Submitted" shows all rows
    if (funnelFilter && statusCol && funnelMinStage >= 0) {
      if (funnelMinStage === 0) return true; // Submitted = all rows
      const val = row.data[statusCol.id] ?? '';
      const opt = statusCol.options?.find(o => o.id === val);
      if (!opt) return false;
      const rowStage = FUNNEL_ORDER.indexOf(opt.label.toLowerCase());
      if (rowStage < funnelMinStage) return false;
    }
    return true;
  });

  // Pagination
  const totalRows  = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * ROWS_PER_PAGE;
  const pageEnd    = pageStart + ROWS_PER_PAGE;
  const pageRows   = filteredRows.slice(pageStart, pageEnd);

  // Reset to page 1 when search changes
  const handleSearch = (v: string) => { setSearch(v); setPage(1); setFunnelFilter(null); };

  // Export
  const handleExport = () => {
    // Include Unique ID as first column
    const headers = ['"Unique ID"', ...columns.map(c => `"${c.name}"`)].join(',');
    const lines = rows.map(row => {
      const idCell = `"${row.display_id ?? ''}"`;
      const dataCells = columns.map(col => {
        let v = row.data[col.id] ?? '';
        if (col.type === 'dropdown') v = col.options?.find(o => o.id === v)?.label ?? '';
        return `"${v.replace(/"/g, '""')}"`;
      });
      return [idCell, ...dataCells].join(',');
    });
    const csv = [headers, ...lines].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'proposals.csv';
    a.click();
  };

  // Page numbers to show (max 7 buttons)
  const getPageNumbers = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
    if (safePage >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', safePage - 1, safePage, safePage + 1, '...', totalPages];
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" style={{ borderWidth: 3 }} />
      <div className="text-center">
        <p className="text-sm font-semibold text-slate-700">Loading data from Supabase...</p>
        <p className="text-xs text-slate-400 mt-1">This may take a moment for large datasets</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-sm text-slate-600 font-medium">Failed to load data</p>
      <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl">Retry</button>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 w-full">
      <PageHeader
        title="Proposal Details"
        subtitle="Manage proposal records in a flexible table view."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Live sync badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl">
              <Wifi size={12} className="text-emerald-500" />
              <span className="text-xs font-medium text-emerald-600">Live sync</span>
            </div>

            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-300 transition-colors"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <Search size={14} className="text-slate-400" />
              <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
                placeholder="Search..." className="text-sm text-slate-600 placeholder-slate-400 outline-none bg-transparent w-32" />
            </div>

            {/* Export */}
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <Download size={14} /><span className="hidden sm:inline">Export</span>
            </button>

            {/* Import */}
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <Upload size={14} /><span className="hidden sm:inline">Import</span>
            </button>

            {/* Add Column */}
            <button onClick={() => setShowAddCol(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <Columns size={14} /><span className="hidden sm:inline">Add Column</span>
            </button>

            {/* Add Row */}
            <button onClick={addRow}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
              <Plus size={14} />Add Row
            </button>
          </div>
        }
      />

      {/* Funnel cards */}
      <FunnelCards
        columns={columns}
        rows={rows}
        onFilterByStatus={optId => { setFunnelFilter(optId); setPage(1); }}
        activeFilter={funnelFilter}
      />

      {/* Stats + pagination info */}
      <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
        <span>
          <strong className="text-slate-800 font-semibold">{totalRows}</strong>
          {search ? ` of ${rows.length} rows` : ' rows'}
        </span>
        <span className="text-slate-300">|</span>
        <span><strong className="text-slate-800 font-semibold">{columns.length}</strong> columns</span>
        {search && (
          <button onClick={() => handleSearch('')} className="text-blue-600 text-xs font-medium">
            Clear search
          </button>
        )}
        {totalPages > 1 && (
          <>
            <span className="text-slate-300">|</span>
            <span>
              Showing <strong className="text-slate-700">{pageStart + 1}–{Math.min(pageEnd, totalRows)}</strong> of <strong className="text-slate-700">{totalRows}</strong>
            </span>
          </>
        )}
        <span className="ml-auto text-xs text-slate-400 hidden md:block">
          Double-click column name to rename · Right-click column header for options
        </span>
      </div>

      {/* Table */}
      <ProposalTable
        columns={columns}
        rows={pageRows}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Prev */}
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <ChevronLeft size={15} /> Previous
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-slate-400 text-sm">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                    safePage === p
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              )
            )}
          </div>

          {/* Next */}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Modals */}
      {showAddCol && (
        <AddColumnModal
          onAdd={(name, type, opts) => addColumn(name, type, opts)}
          onClose={() => setShowAddCol(false)}
        />
      )}

      {showImport && (
        <ImportModal
          columns={columns}
          existingRows={rows}
          onImport={async (newRows, mode) => {
            if (mode === 'overwrite') {
              // Clear everything first, then import fresh
              await clearAllRows();
              localStorage.removeItem('trackhub_la_rows_v1');
            }
            importRows(newRows as Omit<Row, 'id' | 'created_at'>[], mode);
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
};
