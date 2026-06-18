import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Download, Upload, TrendingUp, TrendingDown, DollarSign, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ProposalTable } from '../components/proposals/ProposalTable';
import { AddColumnModal } from '../components/proposals/AddColumnModal';
import { ImportModal } from '../components/proposals/ImportModal';
import { ColumnFilters, applyFilters } from '../components/ui/ColumnFilters';
import type { ActiveFilter } from '../components/ui/ColumnFilters';
import { useTransactions } from '../hooks/useTransactions';
import type { ColumnType, Row } from '../types/proposals';

const ROWS_PER_PAGE = 100;

// Simple bar chart using SVG
const BarChart: React.FC<{ data: {label:string;income:number;expense:number}[]; currencySymbol: string }> = ({ data, currencySymbol }) => {
  if (data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
  const W = 600; const H = 180; const PAD = { l: 48, r: 8, t: 12, b: 40 };
  const barW = Math.max(8, (W - PAD.l - PAD.r) / data.length / 2 - 3);
  const slot  = (W - PAD.l - PAD.r) / data.length;
  const yPos  = (v: number) => PAD.t + (H - PAD.t - PAD.b) * (1 - v / maxVal);
  const barH  = (v: number) => (H - PAD.t - PAD.b) * (v / maxVal);

  const fmt = (n: number) => n >= 1000 ? `${currencySymbol}${(n/1000).toFixed(0)}k` : `${currencySymbol}${n.toFixed(0)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 180 }}>
      {[0,0.25,0.5,0.75,1].map((t,i) => (
        <g key={i}>
          <line x1={PAD.l} y1={PAD.t + (H-PAD.t-PAD.b)*t} x2={W-PAD.r} y2={PAD.t + (H-PAD.t-PAD.b)*t} stroke="#f1f5f9" strokeWidth={1} />
          <text x={PAD.l-4} y={PAD.t + (H-PAD.t-PAD.b)*t + 4} textAnchor="end" fontSize={9} fill="#94a3b8">{fmt(maxVal*(1-t))}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = PAD.l + i * slot + slot/2;
        return (
          <g key={i}>
            {d.income > 0 && <rect x={x - barW - 1} y={yPos(d.income)} width={barW} height={barH(d.income)} fill="#10b981" rx={2} opacity={0.85} />}
            {d.expense > 0 && <rect x={x + 1} y={yPos(d.expense)} width={barW} height={barH(d.expense)} fill="#f43f5e" rx={2} opacity={0.85} />}
            <text x={x} y={H - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

export const TransactionsPage: React.FC = () => {
  const {
    columns, rows, loading,
    addRow, deleteRow, updateCell, importRows,
    addColumn, deleteColumn, renameColumn, changeColumnType,
    resizeColumn, reorderColumns, updateColumnOptions,
  } = useTransactions();

  const [showAddCol,    setShowAddCol]    = useState(false);
  const [showImport,    setShowImport]    = useState(false);
  const [importing,     setImporting]     = useState(false);
  const [importMsg,     setImportMsg]     = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [page,          setPage]          = useState(1);
  const [dateRange,     setDateRange]     = useState<'month'|'quarter'|'year'|'all'>('month');

  const handleFiltersChange = (f: ActiveFilter[]) => { setActiveFilters(f); setPage(1); };

  // Option map for filter display
  const optionMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const col of columns) {
      if (col.type === 'dropdown' && col.options) {
        map[col.id] = {};
        for (const opt of col.options as {id:string;label:string}[]) map[col.id][opt.id] = opt.label;
      }
    }
    return map;
  }, [columns]);

  // Detect key columns by name
  const amountCol  = useMemo(() => columns.find(c => c.name.toLowerCase().includes('amount') || c.name.toLowerCase().includes('value')), [columns]);
  const typeCol    = useMemo(() => columns.find(c => c.name.toLowerCase().includes('type') && c.type === 'dropdown'), [columns]);
  const dateCol    = useMemo(() => columns.find(c => c.name.toLowerCase().includes('date') || c.type === 'date'), [columns]);
  const categoryCol= useMemo(() => columns.find(c => c.name.toLowerCase().includes('category') || c.name.toLowerCase().includes('cat')), [columns]);

  // Helper to resolve option ID -> label
  const resolveLabel = useCallback((colId: string, val: string) => optionMap[colId]?.[val] ?? val, [optionMap]);

  // Normalize date
  const normalizeDate = (val: string): string => {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const mdy = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) return `${mdy[3]}-${mdy[1].padStart(2,'0')}-${mdy[2].padStart(2,'0')}`;
    return val;
  };

  // Parse amount safely
  const parseAmount = (val: string) => parseFloat(val.replace(/[^0-9.-]/g, '')) || 0;

  // Date range filter
  const now = new Date();
  const filteredByDate = useMemo(() => {
    if (!dateCol || dateRange === 'all') return rows;
    const cutoff = new Date();
    if (dateRange === 'month')   cutoff.setMonth(now.getMonth() - 1);
    if (dateRange === 'quarter') cutoff.setMonth(now.getMonth() - 3);
    if (dateRange === 'year')    cutoff.setFullYear(now.getFullYear() - 1);
    return rows.filter(row => {
      const d = normalizeDate(row.data[dateCol.id] ?? '');
      return d >= cutoff.toISOString().slice(0, 10);
    });
  }, [rows, dateCol, dateRange]);

  // Apply column filters
  const filteredRows = useMemo(() => applyFilters(filteredByDate, activeFilters), [filteredByDate, activeFilters]);

  // Pagination
  const totalRows  = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / ROWS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filteredRows.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  // ── Stats ───────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let totalIncome = 0, totalExpense = 0;
    for (const row of filteredRows) {
      const amount = amountCol ? parseAmount(row.data[amountCol.id] ?? '') : 0;
      if (typeCol) {
        const typeLabel = resolveLabel(typeCol.id, row.data[typeCol.id] ?? '').toLowerCase();
        if (typeLabel.includes('income') || typeLabel.includes('earning') || typeLabel.includes('revenue') || typeLabel.includes('credit') || typeLabel.includes('in')) totalIncome += amount;
        else totalExpense += Math.abs(amount);
      } else {
        if (amount >= 0) totalIncome += amount;
        else totalExpense += Math.abs(amount);
      }
    }
    return { totalIncome, totalExpense, balance: totalIncome - totalExpense, count: filteredRows.length };
  }, [filteredRows, amountCol, typeCol, resolveLabel]);

  // ── Monthly chart data ──────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!dateCol || !amountCol) return [];
    const byMonth: Record<string, { income: number; expense: number }> = {};
    for (const row of filteredByDate) {
      const d = normalizeDate(row.data[dateCol.id] ?? '');
      if (!d) continue;
      const month = d.slice(0, 7); // YYYY-MM
      if (!byMonth[month]) byMonth[month] = { income: 0, expense: 0 };
      const amount = parseAmount(row.data[amountCol.id] ?? '');
      if (typeCol) {
        const typeLabel = resolveLabel(typeCol.id, row.data[typeCol.id] ?? '').toLowerCase();
        if (typeLabel.includes('income') || typeLabel.includes('earning') || typeLabel.includes('credit') || typeLabel.includes('in')) byMonth[month].income += amount;
        else byMonth[month].expense += Math.abs(amount);
      } else {
        if (amount >= 0) byMonth[month].income += amount; else byMonth[month].expense += Math.abs(amount);
      }
    }
    return Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, vals]) => ({
      label: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: '2-digit' }),
      ...vals,
    }));
  }, [filteredByDate, dateCol, amountCol, typeCol, resolveLabel]);

  // ── Category breakdown ──────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    if (!categoryCol || !amountCol) return [];
    const byCat: Record<string, number> = {};
    for (const row of filteredRows) {
      const cat = resolveLabel(categoryCol.id, row.data[categoryCol.id] ?? '') || 'Uncategorised';
      const amount = Math.abs(parseAmount(row.data[amountCol.id] ?? ''));
      byCat[cat] = (byCat[cat] ?? 0) + amount;
    }
    return Object.entries(byCat).sort(([,a],[,b]) => b - a).slice(0, 8);
  }, [filteredRows, categoryCol, amountCol, resolveLabel]);

  const fmt = (n: number) => n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Export CSV
  const handleExport = () => {
    const headers = columns.map(c => `"${c.name}"`).join(',');
    const lines = filteredRows.map(row =>
      columns.map(col => `"${(row.data[col.id] ?? '').replace(/"/g,'""')}"`).join(',')
    );
    const csv = [headers, ...lines].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'transactions.csv'; a.click();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-slate-500">Loading transactions...</span>
    </div>
  );

  return (
    <div className="space-y-5 w-full">
      <PageHeader
        title="Transactions"
        subtitle={`${rows.length.toLocaleString()} total transactions`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <Upload size={14} /> Import
            </button>
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <Download size={14} /> Export
            </button>
            <button onClick={() => setShowAddCol(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
              style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <BarChart2 size={14} /> Add Column
            </button>
            <button onClick={addRow}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
              <Plus size={14} /> Add Row
            </button>
          </div>
        }
      />

      {/* Import progress */}
      {importing && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${
          importMsg.startsWith('✓') ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
          importMsg.startsWith('✗') ? 'bg-red-50 border-red-200 text-red-700' :
          'bg-blue-50 border-blue-200 text-blue-700'}`}>
          {!importMsg.startsWith('✓') && !importMsg.startsWith('✗') &&
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />}
          {importMsg}
        </div>
      )}

      {/* ── Stats cards ── */}
      {amountCol && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Income',  value: stats.totalIncome,  icon: <TrendingUp size={16} />,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
            { label: 'Total Expense', value: stats.totalExpense, icon: <TrendingDown size={16} />, color: 'text-red-500',     bg: 'bg-red-50 border-red-200' },
            { label: 'Net Balance',   value: stats.balance,      icon: <DollarSign size={16} />,  color: stats.balance >= 0 ? 'text-blue-600' : 'text-red-500', bg: 'bg-blue-50 border-blue-200' },
            { label: 'Transactions',  value: stats.count,        icon: <BarChart2 size={16} />,   color: 'text-violet-600',  bg: 'bg-violet-50 border-violet-200', isCount: true },
          ].map(({ label, value, icon, color, bg, isCount }) => (
            <div key={label} className={`${bg} border rounded-2xl p-4`} style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className={`flex items-center gap-1.5 mb-2 ${color}`}>{icon}<span className="text-xs font-bold uppercase tracking-wide">{label}</span></div>
              <p className={`text-2xl font-bold leading-none ${color}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                {isCount ? (value as number).toLocaleString() : fmt(value as number)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── Chart ── */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Monthly Overview</h3>
              <div className="flex items-center gap-3 mt-1">
                <div className="flex items-center gap-1"><span className="w-3 h-2 bg-emerald-500 rounded-sm inline-block" /><span className="text-xs text-slate-500">Income</span></div>
                <div className="flex items-center gap-1"><span className="w-3 h-2 bg-red-400 rounded-sm inline-block" /><span className="text-xs text-slate-500">Expense</span></div>
              </div>
            </div>
            <div className="flex gap-1">
              {(['month','quarter','year','all'] as const).map(r => (
                <button key={r} onClick={() => setDateRange(r)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${dateRange === r ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {r === 'month' ? '1M' : r === 'quarter' ? '3M' : r === 'year' ? '1Y' : 'All'}
                </button>
              ))}
            </div>
          </div>
          <BarChart data={chartData} currencySymbol="$" />
        </div>
      )}

      {/* ── Category breakdown ── */}
      {categoryData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <h3 className="text-sm font-bold text-slate-800 mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Top Categories</h3>
          <div className="space-y-2">
            {categoryData.map(([cat, amount], i) => {
              const max = categoryData[0][1];
              const pct = Math.round((amount / max) * 100);
              const colors = ['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-red-400','bg-cyan-500','bg-pink-500','bg-orange-500'];
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-28 truncate flex-shrink-0">{cat}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div className={`${colors[i % colors.length]} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 w-20 text-right tabular-nums">{fmt(amount)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Filters + table ── */}
      {columns.length > 0 && (
        <ColumnFilters
          columns={columns}
          activeFilters={activeFilters}
          onFiltersChange={handleFiltersChange}
          optionMap={optionMap}
        />
      )}

      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span><strong className="text-slate-800">{totalRows.toLocaleString()}</strong> rows</span>
        {activeFilters.length > 0 && <span className="text-xs text-blue-600">({rows.length.toLocaleString()} total)</span>}
        <span className="ml-auto text-xs text-slate-400 hidden md:block">
          Right-click column header for options · Double-click to rename
        </span>
      </div>

      {columns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-100 gap-3">
          <BarChart2 size={32} className="text-slate-200" />
          <p className="text-sm font-semibold text-slate-500">No columns yet</p>
          <p className="text-xs text-slate-400">Click <strong>Add Column</strong> to start building your transaction table</p>
          <button onClick={() => setShowAddCol(true)}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Add Column
          </button>
        </div>
      ) : (
        <ProposalTable
          columns={columns}
          rows={pageRows}
          onUpdateCell={updateCell}
          onDeleteRow={deleteRow}
          onDuplicateRow={(_id: string) => {}}
          onDeleteColumn={deleteColumn}
          onRenameColumn={renameColumn}
          onChangeColumnType={changeColumnType}
          onResizeColumn={resizeColumn}
          onReorderColumns={reorderColumns}
          onUpdateColumnOptions={updateColumnOptions}
          onMoveLeft={(id: string) => { const i = columns.findIndex(c => c.id === id); if (i > 0) reorderColumns(id, columns[i-1].id, 'before'); }}
          onMoveRight={(id: string) => { const i = columns.findIndex(c => c.id === id); if (i < columns.length-1) reorderColumns(id, columns[i+1].id, 'after'); }}
          onDuplicateColumn={(_id: string) => {}}
          searchHighlight=""
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={safePage === 1}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors">
            <ChevronLeft size={15} /> Previous
          </button>
          <span className="text-sm text-slate-500">Page <strong>{safePage}</strong> of <strong>{totalPages}</strong></span>
          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={safePage === totalPages}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors">
            Next <ChevronRight size={15} />
          </button>
        </div>
      )}

      {/* Modals */}
      {showAddCol && (
        <AddColumnModal
          onAdd={(name, type, options) => { addColumn(name, type as ColumnType, options); setShowAddCol(false); }}
          onClose={() => setShowAddCol(false)}
        />
      )}

      {showImport && (
        <ImportModal
          columns={columns}
          existingRows={rows}
          onImport={async (newRows, mode) => {
            setShowImport(false); setImporting(true);
            setImportMsg(`Saving ${newRows.length} rows to Supabase...`);
            try {
              await importRows(newRows as Omit<Row,'id'|'created_at'>[], mode);
              setImportMsg(`✓ ${newRows.length} rows saved`);
              setTimeout(() => { setImporting(false); setImportMsg(''); }, 3000);
            } catch (e: any) {
              setImportMsg(`✗ ${e?.message ?? 'Import failed'}`);
              setTimeout(() => { setImporting(false); setImportMsg(''); }, 5000);
            }
          }}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
};
