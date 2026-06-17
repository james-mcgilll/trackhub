import React, { useState } from 'react';
import { Columns, Search, Download, Info, RefreshCw } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { LATable } from '../components/leadAnalysis/LATable';
import { AddLAColumnModal } from '../components/leadAnalysis/AddLAColumnModal';
import { useProposals } from '../context/ProposalContext';
import { useLeadAnalysis } from '../hooks/useLeadAnalysis';

const ROWS_PER_PAGE = 100;



export const LeadAnalysisPage: React.FC = () => {
  const { columns: proposalColumns, rows: proposalRows, loading: proposalLoading } = useProposals();
  const {
    laColumns, mergedRows, statusCol,
    addLinkedColumn, addLocalColumn,
    deleteColumn, renameColumn, resizeColumn, reorderColumns, updateColumnOptions,
    updateCell, forceResync, syncStatus, loading,
  } = useLeadAnalysis(proposalColumns, proposalRows);

  const [showAddCol, setShowAddCol] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);

  // Filter
  const filtered = search.trim()
    ? mergedRows.filter(r =>
        r.uniqueId.toLowerCase().includes(search.toLowerCase()) ||
        r.currentStatus.toLowerCase().includes(search.toLowerCase()) ||
        Object.values(r.data).some(v => String(v).toLowerCase().includes(search.toLowerCase()))
      )
    : mergedRows;

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  // Export
  const handleExport = () => {
    const headers = ['Unique ID', 'Current Status', ...laColumns.map(c => c.name)].map(h => `"${h}"`).join(',');
    const lines = mergedRows.map(row =>
      [row.uniqueId, row.currentStatus, ...laColumns.map(col => row.data[col.id] ?? '')].map(v => `"${v.replace(/"/g, '""')}"`).join(',')
    );
    const csv = [headers, ...lines].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'lead-analysis.csv';
    a.click();
  };

  // Status breakdown
  // Funnel stage order — each stage includes all later stages
  const FUNNEL_ORDER = ['Contacted', 'Interviewed', 'Hired'];

  // Exact counts per stage
  const exactCounts = mergedRows.reduce((acc, r) => {
    const s = r.currentStatus || 'Unknown';
    acc[s] = (acc[s] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Cumulative counts — Contacted = Contacted + Interviewed + Hired
  const stageCounts: Record<string, number> = {};
  for (let i = 0; i < FUNNEL_ORDER.length; i++) {
    stageCounts[FUNNEL_ORDER[i]] = FUNNEL_ORDER
      .slice(i) // this stage + all later stages
      .reduce((sum, s) => sum + (exactCounts[s] ?? 0), 0);
  }



  return (
    <div className="flex flex-col gap-5 w-full">
      <PageHeader
        title="Lead Analysis"
        subtitle="Detailed analysis of Contacted, Interviewed, and Hired leads."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:border-blue-300 transition-colors"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <Search size={14} className="text-slate-400" />
              <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
                placeholder="Search..." className="text-sm text-slate-600 placeholder-slate-400 outline-none bg-transparent w-32" />
            </div>
            {/* Resync */}
            <button
              onClick={() => { setResyncing(true); forceResync(); setTimeout(() => setResyncing(false), 1000); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              title="Resync all leads from Proposal Details"
            >
              <RefreshCw size={14} className={resyncing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{resyncing ? 'Syncing...' : 'Resync'}</span>
            </button>
            {/* Export */}
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <Download size={14} /><span className="hidden sm:inline">Export</span>
            </button>
            {/* Add Column */}
            <button onClick={() => setShowAddCol(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
              <Columns size={14} />Add Column
            </button>
          </div>
        }
      />

      {/* Info banner */}
      {!statusCol ? (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Info size={15} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-700">Status column not detected</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Make sure your Proposal Details table has a dropdown column with options: Contacted, Interviewed, Hired.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-700">Auto-populated from Proposal Details</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Linked to <strong>"{statusCol.name}"</strong> column. Leads marked as Contacted, Interviewed, or Hired appear here automatically.
              Add columns below to enrich these leads. Click <strong>Resync</strong> if counts don't match Proposal Details.
            </p>
          </div>
        </div>
      )}

      {/* Loading / sync status */}
      {(proposalLoading || loading || syncStatus) && (
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5">
          <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <p className="text-xs text-blue-700 font-medium">
            {proposalLoading ? 'Loading data from Proposal Details...' : syncStatus || 'Syncing leads...'}
          </p>
        </div>
      )}


      {/* Status summary cards — cumulative funnel */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { stage: 'Contacted',   color: '#7c3aed', bg: 'bg-violet-50',  border: 'border-violet-200',  desc: 'Contacted or beyond' },
          { stage: 'Interviewed', color: '#0891b2', bg: 'bg-cyan-50',    border: 'border-cyan-200',    desc: 'Interviewed or beyond' },
          { stage: 'Hired',       color: '#059669', bg: 'bg-emerald-50', border: 'border-emerald-200', desc: 'Hired only' },
        ].map(({ stage, color, bg, border, desc }) => (
          <div key={stage} className={`${bg} border ${border} rounded-2xl p-4`}
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p className="text-xs font-bold uppercase tracking-wide mb-0.5" style={{ color }}>{stage}</p>
            <p className="text-3xl font-bold leading-none" style={{ fontFamily: "'Space Grotesk', sans-serif", color }}>
              {stageCounts[stage] ?? 0}
            </p>
            <p className="text-xs mt-1.5" style={{ color, opacity: 0.7 }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
        <span><strong className="text-slate-800 font-semibold">{filtered.length}</strong>
          {search ? ` of ${mergedRows.length} leads` : ' leads'}
        </span>
        <span className="text-slate-300">|</span>
        <span><strong className="text-slate-800 font-semibold">{laColumns.length}</strong> columns</span>
        {search && <button onClick={() => handleSearch('')} className="text-blue-600 text-xs font-medium">Clear</button>}
        <span className="ml-auto text-xs text-slate-400 hidden md:block">
          Right-click column header for options · Drag ⠿ to reorder · 🔗 = linked from Proposal Details (read-only)
        </span>
      </div>

      {/* Table */}
      <LATable
        columns={laColumns}
        rows={pageRows}
        onUpdateCell={updateCell}
        onDeleteColumn={deleteColumn}
        onRenameColumn={renameColumn}
        onResizeColumn={resizeColumn}
        onReorderColumns={reorderColumns}
        onUpdateColumnOptions={updateColumnOptions}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors">
            ← Previous
          </button>
          <span className="text-sm text-slate-500">
            Page <strong>{safePage}</strong> of <strong>{totalPages}</strong>
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors">
            Next →
          </button>
        </div>
      )}

      {/* Add Column Modal */}
      {showAddCol && (
        <AddLAColumnModal
          proposalColumns={proposalColumns}
          onAddLinked={addLinkedColumn}
          onAddLocal={addLocalColumn}
          onClose={() => setShowAddCol(false)}
        />
      )}
    </div>
  );
};
