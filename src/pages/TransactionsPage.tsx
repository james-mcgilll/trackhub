import React, { useState, useMemo, useRef, useCallback, memo } from 'react';
import { Plus, Download, Upload, TrendingUp, TrendingDown, DollarSign, BarChart2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ColumnFilters, applyFilters } from '../components/ui/ColumnFilters';
import type { ActiveFilter } from '../components/ui/ColumnFilters';
import { useTransactions } from '../hooks/useTransactions';
import type { Column, ColumnType } from '../types/proposals';
import { OPTION_COLOR_STYLES } from '../types/proposals';
import { AddColumnModal } from '../components/proposals/AddColumnModal';
import { ImportModal } from '../components/proposals/ImportModal';

const ROWS_PER_PAGE = 100;
const ROW_H = 40;

// ── Editable cell ─────────────────────────────────────────────────────────────
const Cell = memo(({ col, value, onChange }: { col: Column; value: string; onChange: (v: string) => void }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [dropOpen, setDropOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => { if (!editing) setDraft(value); }, [value, editing]);
  React.useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);
  React.useEffect(() => {
    if (!dropOpen) return;
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [dropOpen]);

  const commit = () => { setEditing(false); if (draft !== value) onChange(draft); };

  if (col.type === 'dropdown') {
    const opts = (col.options as {id:string;label:string;color:string}[]) ?? [];
    const sel = opts.find(o => o.id === value);
    return (
      <div ref={dropRef} className="relative w-full h-full">
        <button onClick={() => setDropOpen(o => !o)} className="w-full h-full flex items-center px-2.5 hover:bg-slate-50 focus:outline-none">
          {sel ? <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${OPTION_COLOR_STYLES[sel.color]?.full ?? 'bg-slate-100 text-slate-600'}`}>{sel.label}</span>
               : <span className="text-slate-300 text-xs">—</span>}
        </button>
        {dropOpen && (
          <div className="absolute top-full left-0 mt-0.5 z-50 bg-white border border-slate-200 rounded-xl shadow-xl min-w-36 py-1" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
            <button onClick={() => { onChange(''); setDropOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-50">— Clear</button>
            {opts.map(o => (
              <button key={o.id} onClick={() => { onChange(o.id); setDropOpen(false); }} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${OPTION_COLOR_STYLES[o.color]?.full ?? ''}`}>{o.label}</span>
                {value === o.id && <span className="ml-auto text-blue-500 text-xs">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (col.type === 'date') {
    const display = value ? value.split('-').reverse().join('/') : '';
    return (
      <div className="relative w-full h-full">
        <div className="w-full h-full flex items-center px-2.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
          {display || <span className="text-slate-300">dd/mm/yyyy</span>}
        </div>
        <input type="date" value={value || ''} onChange={e => onChange(e.target.value)} className="absolute inset-0 opacity-0 w-full cursor-pointer" />
      </div>
    );
  }

  if (editing) {
    return (
      <input ref={inputRef} value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
        type={col.type === 'number' ? 'number' : col.type === 'link' ? 'url' : 'text'}
        className="w-full h-full px-2.5 text-xs text-slate-700 bg-blue-50 outline-none ring-1 ring-inset ring-blue-300" />
    );
  }

  return (
    <div onClick={() => setEditing(true)} className="w-full h-full flex items-center px-2.5 hover:bg-slate-50 cursor-text">
      {value ? <span className="text-xs text-slate-700 truncate">{value}</span> : <span className="text-slate-300 text-xs">—</span>}
    </div>
  );
});

// ── Column header ─────────────────────────────────────────────────────────────
const ColHeader = memo(({ col, onRename, onDelete, onResize, isFirst, isLast, onMoveLeft, onMoveRight }: {
  col: Column; onRename: (id: string, name: string) => void; onDelete: (id: string) => void;
  onResize: (id: string, w: number) => void; isFirst: boolean; isLast: boolean;
  onMoveLeft: (id: string) => void; onMoveRight: (id: string) => void;
}) => {
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(col.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null);

  React.useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menu]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    resizeRef.current = { startX: e.clientX, startW: col.width };
    const onMove = (ev: MouseEvent) => { if (resizeRef.current) onResize(col.id, resizeRef.current.startW + ev.clientX - resizeRef.current.startX); };
    const onUp = () => { resizeRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
  };

  return (
    <th className="border-r border-slate-100 text-left relative group/th" style={{ height: 40, width: col.width }}
      onContextMenu={e => { e.preventDefault(); setMenu(true); }}>
      <div className="flex items-center h-full px-2.5 gap-1 overflow-hidden">
        {renaming ? (
          <input autoFocus value={name} onChange={e => setName(e.target.value)}
            onBlur={() => { onRename(col.id, name.trim() || col.name); setRenaming(false); }}
            onKeyDown={e => { if (e.key === 'Enter') { onRename(col.id, name.trim() || col.name); setRenaming(false); } if (e.key === 'Escape') { setName(col.name); setRenaming(false); } }}
            className="flex-1 text-xs font-semibold bg-white border border-blue-400 rounded px-1.5 py-0.5 outline-none min-w-0" />
        ) : (
          <span onDoubleClick={() => setRenaming(true)} className="text-xs font-semibold text-slate-600 truncate flex-1 select-none cursor-default">{col.name}</span>
        )}
      </div>
      {/* Resize handle */}
      <div onMouseDown={startResize} className="absolute right-0 top-0 w-1.5 h-full cursor-col-resize opacity-0 group-hover/th:opacity-100 bg-blue-300 transition-opacity z-10" />
      {/* Context menu */}
      {menu && (
        <div ref={menuRef} className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 min-w-40" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
          <button onClick={() => { setRenaming(true); setMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">✏️ Rename</button>
          <button onClick={() => { onMoveLeft(col.id); setMenu(false); }} disabled={isFirst} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-30">← Move left</button>
          <button onClick={() => { onMoveRight(col.id); setMenu(false); }} disabled={isLast} className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-30">→ Move right</button>
          <div className="border-t border-slate-100 my-1" />
          <button onClick={() => { onDelete(col.id); setMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50">🗑 Delete column</button>
        </div>
      )}
    </th>
  );
});

// ── Simple SVG bar chart ──────────────────────────────────────────────────────
const MiniBarChart: React.FC<{ data: { label: string; income: number; expense: number }[] }> = ({ data }) => {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
  const W = 700; const H = 160; const PL = 48; const PB = 32; const PT = 10; const PR = 8;
  const cw = (W - PL - PR) / data.length;
  const bw = Math.max(6, cw / 2 - 3);
  const y = (v: number) => PT + (H - PT - PB) * (1 - v / max);
  const h = (v: number) => (H - PT - PB) * (v / max);
  const fmt = (n: number) => n >= 1000 ? `${(n/1000).toFixed(0)}k` : `${n.toFixed(0)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 160 }}>
      {[0,0.5,1].map((t,i) => (
        <g key={i}>
          <line x1={PL} y1={PT+(H-PT-PB)*t} x2={W-PR} y2={PT+(H-PT-PB)*t} stroke="#f1f5f9" strokeWidth={1}/>
          <text x={PL-4} y={PT+(H-PT-PB)*t+4} textAnchor="end" fontSize={9} fill="#94a3b8">{fmt(max*(1-t))}</text>
        </g>
      ))}
      {data.map((d,i) => {
        const cx = PL + i*cw + cw/2;
        return (
          <g key={i}>
            {d.income>0  && <rect x={cx-bw-1} y={y(d.income)}  width={bw} height={h(d.income)}  fill="#10b981" rx={2} opacity={0.85}/>}
            {d.expense>0 && <rect x={cx+1}    y={y(d.expense)} width={bw} height={h(d.expense)} fill="#f43f5e" rx={2} opacity={0.85}/>}
            <text x={cx} y={H-4} textAnchor="middle" fontSize={9} fill="#94a3b8">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export const TransactionsPage: React.FC = () => {
  const { columns, rows, loading, addRow, deleteRow, updateCell, importRows, addColumn, deleteColumn, renameColumn, resizeColumn, reorderColumns } = useTransactions();

  const [showAddCol,    setShowAddCol]    = useState(false);
  const [showImport,    setShowImport]    = useState(false);
  const [importing,     setImporting]     = useState(false);
  const [importMsg,     setImportMsg]     = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [page,          setPage]          = useState(1);
  const [dateRange,     setDateRange]     = useState<'1M'|'3M'|'1Y'|'All'>('All');

  const handleFiltersChange = (f: ActiveFilter[]) => { setActiveFilters(f); setPage(1); };

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

  const resolveLabel = useCallback((colId: string, val: string) => optionMap[colId]?.[val] ?? val, [optionMap]);

  const normalizeDate = (val: string) => {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
    return val;
  };

  const parseAmt = (v: string) => parseFloat(v.replace(/[^0-9.-]/g, '')) || 0;

  const amountCol   = useMemo(() => columns.find(c => /amount|value|price|cost/i.test(c.name)), [columns]);
  const typeCol     = useMemo(() => columns.find(c => /type|category|kind/i.test(c.name) && c.type === 'dropdown'), [columns]);
  const dateCol     = useMemo(() => columns.find(c => c.type === 'date' || /date/i.test(c.name)), [columns]);
  const categoryCol = useMemo(() => columns.find(c => /categor/i.test(c.name) && c.id !== typeCol?.id), [columns, typeCol]);

  // Date range filter
  const dateFilteredRows = useMemo(() => {
    if (dateRange === 'All' || !dateCol) return rows;
    const cutoff = new Date();
    if (dateRange === '1M') cutoff.setMonth(cutoff.getMonth() - 1);
    if (dateRange === '3M') cutoff.setMonth(cutoff.getMonth() - 3);
    if (dateRange === '1Y') cutoff.setFullYear(cutoff.getFullYear() - 1);
    const cutStr = cutoff.toISOString().slice(0, 10);
    return rows.filter(r => normalizeDate(r.data[dateCol.id] ?? '') >= cutStr);
  }, [rows, dateCol, dateRange]);

  const filteredRows = useMemo(() => applyFilters(dateFilteredRows, activeFilters), [dateFilteredRows, activeFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filteredRows.slice((safePage-1)*ROWS_PER_PAGE, safePage*ROWS_PER_PAGE);

  // Stats
  const stats = useMemo(() => {
    let income = 0, expense = 0;
    for (const row of filteredRows) {
      if (!amountCol) continue;
      const amt = parseAmt(row.data[amountCol.id] ?? '');
      if (typeCol) {
        const label = resolveLabel(typeCol.id, row.data[typeCol.id] ?? '').toLowerCase();
        if (/income|earn|revenue|credit|receipt|in\b/.test(label)) income += Math.abs(amt);
        else expense += Math.abs(amt);
      } else {
        if (amt >= 0) income += amt; else expense += Math.abs(amt);
      }
    }
    return { income, expense, balance: income - expense };
  }, [filteredRows, amountCol, typeCol, resolveLabel]);

  // Chart data
  const chartData = useMemo(() => {
    if (!dateCol || !amountCol) return [];
    const by: Record<string, {income:number;expense:number}> = {};
    for (const row of dateFilteredRows) {
      const d = normalizeDate(row.data[dateCol.id] ?? '');
      if (!d) continue;
      const mo = d.slice(0, 7);
      if (!by[mo]) by[mo] = { income: 0, expense: 0 };
      const amt = parseAmt(row.data[amountCol.id] ?? '');
      if (typeCol) {
        const label = resolveLabel(typeCol.id, row.data[typeCol.id] ?? '').toLowerCase();
        if (/income|earn|revenue|credit|in\b/.test(label)) by[mo].income += Math.abs(amt);
        else by[mo].expense += Math.abs(amt);
      } else {
        if (amt >= 0) by[mo].income += amt; else by[mo].expense += Math.abs(amt);
      }
    }
    return Object.entries(by).sort(([a],[b]) => a.localeCompare(b)).slice(-12).map(([mo, v]) => ({
      label: new Date(mo+'-01').toLocaleDateString('en',{month:'short',year:'2-digit'}), ...v
    }));
  }, [dateFilteredRows, dateCol, amountCol, typeCol, resolveLabel]);

  // Category breakdown
  const catData = useMemo(() => {
    if (!categoryCol || !amountCol) return [];
    const by: Record<string,number> = {};
    for (const row of filteredRows) {
      const cat = resolveLabel(categoryCol.id, row.data[categoryCol.id]??'') || 'Other';
      by[cat] = (by[cat]??0) + Math.abs(parseAmt(row.data[amountCol.id]??''));
    }
    return Object.entries(by).sort(([,a],[,b])=>b-a).slice(0,8);
  }, [filteredRows, categoryCol, amountCol, resolveLabel]);

  const fmt = (n: number) => n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleExport = () => {
    const h = columns.map(c=>`"${c.name}"`).join(',');
    const lines = filteredRows.map(r => columns.map(c=>`"${(r.data[c.id]??'').replace(/"/g,'""')}"`).join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[h,...lines].join('\n')], {type:'text/csv'}));
    a.download = 'transactions.csv'; a.click();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
      <span className="text-sm text-slate-500">Loading transactions...</span>
    </div>
  );

  return (
    <div className="space-y-5 w-full">
      <PageHeader title="Transactions" subtitle={`${rows.length.toLocaleString()} transactions · ${columns.length} columns`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowImport(true)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors" style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
              <Upload size={14}/> Import
            </button>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors" style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
              <Download size={14}/> Export
            </button>
            <button onClick={() => setShowAddCol(true)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors" style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
              <BarChart2 size={14}/> Add Column
            </button>
            <button onClick={addRow} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
              <Plus size={14}/> Add Row
            </button>
          </div>
        }
      />

      {importing && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium ${importMsg.startsWith('✓')?'bg-emerald-50 border-emerald-200 text-emerald-700':importMsg.startsWith('✗')?'bg-red-50 border-red-200 text-red-700':'bg-blue-50 border-blue-200 text-blue-700'}`}>
          {!importMsg.startsWith('✓')&&!importMsg.startsWith('✗')&&<div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0"/>}
          {importMsg}
        </div>
      )}

      {/* Stats */}
      {amountCol && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            {label:'Total Income',  val:stats.income,  icon:<TrendingUp size={15}/>,  cls:'bg-emerald-50 border-emerald-200 text-emerald-700'},
            {label:'Total Expense', val:stats.expense, icon:<TrendingDown size={15}/>, cls:'bg-red-50 border-red-200 text-red-500'},
            {label:'Net Balance',   val:stats.balance, icon:<DollarSign size={15}/>,  cls:stats.balance>=0?'bg-blue-50 border-blue-200 text-blue-600':'bg-red-50 border-red-200 text-red-500'},
          ].map(({label,val,icon,cls})=>(
            <div key={label} className={`${cls} border rounded-2xl p-4`} style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
              <div className="flex items-center gap-1.5 mb-2 opacity-80">{icon}<span className="text-xs font-bold uppercase tracking-wide">{label}</span></div>
              <p className="text-2xl font-bold leading-none" style={{fontFamily:"'Space Grotesk',sans-serif"}}>{fmt(val)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-800" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Monthly Overview</h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-xs text-slate-500"><span className="w-3 h-2 bg-emerald-500 rounded-sm inline-block"/>Income</span>
                <span className="flex items-center gap-1 text-xs text-slate-500"><span className="w-3 h-2 bg-red-400 rounded-sm inline-block"/>Expense</span>
              </div>
            </div>
            <div className="flex gap-1">
              {(['1M','3M','1Y','All'] as const).map(r=>(
                <button key={r} onClick={()=>setDateRange(r)} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${dateRange===r?'bg-blue-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{r}</button>
              ))}
            </div>
          </div>
          <MiniBarChart data={chartData}/>
        </div>
      )}

      {/* Category breakdown */}
      {catData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          <h3 className="text-sm font-bold text-slate-800 mb-3" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Top Categories</h3>
          <div className="space-y-2">
            {catData.map(([cat,amt],i)=>{
              const pct = Math.round((amt/catData[0][1])*100);
              const cols=['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-red-400','bg-cyan-500','bg-pink-500','bg-orange-500'];
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-28 truncate flex-shrink-0">{cat}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2"><div className={`${cols[i%cols.length]} h-2 rounded-full`} style={{width:`${pct}%`}}/></div>
                  <span className="text-xs font-semibold text-slate-700 w-20 text-right tabular-nums">{fmt(amt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      {columns.length > 0 && (
        <ColumnFilters columns={columns} activeFilters={activeFilters} onFiltersChange={handleFiltersChange} optionMap={optionMap}/>
      )}

      {/* Row count */}
      <div className="flex items-center gap-3 text-xs text-slate-500">
        <span><strong className="text-slate-700">{filteredRows.length.toLocaleString()}</strong> rows{activeFilters.length>0 ? ` of ${rows.length.toLocaleString()} total` : ''}</span>
        {columns.length > 0 && <span className="text-slate-300">·</span>}
        {columns.length > 0 && <span><strong className="text-slate-700">{columns.length}</strong> columns</span>}
        {columns.length > 0 && <span className="ml-auto text-slate-400 hidden md:block">Right-click column header · Double-click to rename</span>}
      </div>

      {/* Table */}
      {columns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 gap-3">
          <BarChart2 size={36} className="text-slate-200"/>
          <p className="text-sm font-semibold text-slate-500">No columns yet</p>
          <p className="text-xs text-slate-400">Click <strong>Add Column</strong> to build your transaction table</p>
          <button onClick={()=>setShowAddCol(true)} className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
            <Plus size={14}/> Add Column
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white" style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          <table className="border-collapse w-full" style={{tableLayout:'fixed', minWidth: columns.reduce((s,c)=>s+c.width,0)}}>
            <colgroup>{columns.map(c=><col key={c.id} style={{width:c.width,minWidth:c.width}}/>)}</colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columns.map((col,i)=>(
                  <ColHeader key={col.id} col={col}
                    onRename={renameColumn} onDelete={deleteColumn} onResize={resizeColumn}
                    isFirst={i===0} isLast={i===columns.length-1}
                    onMoveLeft={id=>{if(i>0) reorderColumns(id,columns[i-1].id,'before');}}
                    onMoveRight={id=>{if(i<columns.length-1) reorderColumns(id,columns[i+1].id,'after');}}
                  />
                ))}
                {/* Delete row column */}
                <th className="border-l border-slate-100" style={{width:40,minWidth:40}}/>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr><td colSpan={columns.length+1} className="text-center py-12 text-sm text-slate-400">
                  No rows yet — click <strong>Add Row</strong> to start
                </td></tr>
              ) : pageRows.map(row=>(
                <tr key={row.id} className="border-b border-slate-100 last:border-0 hover:bg-blue-50/20 group/row" style={{height:ROW_H}}>
                  {columns.map(col=>(
                    <td key={col.id} className="border-r border-slate-100 p-0" style={{width:col.width,height:ROW_H}}>
                      <Cell col={col} value={row.data[col.id]??''} onChange={v=>updateCell(row.id,col.id,v)}/>
                    </td>
                  ))}
                  <td className="border-l border-slate-100 text-center" style={{width:40}}>
                    <button onClick={()=>deleteRow(row.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover/row:opacity-100">
                      <Trash2 size={13}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={safePage===1} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-40">
            <ChevronLeft size={15}/> Previous
          </button>
          <span className="text-sm text-slate-500">Page <strong>{safePage}</strong> of <strong>{totalPages}</strong></span>
          <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={safePage===totalPages} className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 disabled:opacity-40">
            Next <ChevronRight size={15}/>
          </button>
        </div>
      )}

      {showAddCol && (
        <AddColumnModal
          onAdd={(name,type,options)=>{ addColumn(name,type as ColumnType,options); setShowAddCol(false); }}
          onClose={()=>setShowAddCol(false)}
        />
      )}

      {showImport && (
        <ImportModal columns={columns} existingRows={rows}
          onImport={async(newRows,mode)=>{
            setShowImport(false); setImporting(true);
            setImportMsg(`Saving ${newRows.length} rows...`);
            try {
              await importRows(newRows as any, mode);
              setImportMsg(`✓ ${newRows.length} rows saved`);
              setTimeout(()=>{setImporting(false);setImportMsg('');},3000);
            } catch(e:any) {
              setImportMsg(`✗ ${e?.message??'Import failed'}`);
              setTimeout(()=>{setImporting(false);setImportMsg('');},5000);
            }
          }}
          onClose={()=>setShowImport(false)}
        />
      )}
    </div>
  );
};
