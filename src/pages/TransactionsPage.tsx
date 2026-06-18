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

const MiniBarChart: React.FC<{ data: {label:string;income:number;expense:number}[] }> = ({ data }) => {
  if (!data.length) return null;
  const max = Math.max(...data.map(d => Math.max(d.income, d.expense)), 1);
  const W=700,H=160,PL=48,PB=32,PT=10,PR=8;
  const cw = (W-PL-PR)/data.length;
  const bw = Math.max(6, cw/2-3);
  const y  = (v:number) => PT+(H-PT-PB)*(1-v/max);
  const h  = (v:number) => (H-PT-PB)*(v/max);
  const fmt = (n:number) => n>=1000?`${(n/1000).toFixed(0)}k`:`${n.toFixed(0)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{maxHeight:160}}>
      {[0,0.5,1].map((t,i)=>(
        <g key={i}>
          <line x1={PL} y1={PT+(H-PT-PB)*t} x2={W-PR} y2={PT+(H-PT-PB)*t} stroke="#f1f5f9" strokeWidth={1}/>
          <text x={PL-4} y={PT+(H-PT-PB)*t+4} textAnchor="end" fontSize={9} fill="#94a3b8">{fmt(max*(1-t))}</text>
        </g>
      ))}
      {data.map((d,i)=>{
        const cx=PL+i*cw+cw/2;
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

export const TransactionsPage: React.FC = () => {
  const {
    columns, rows, loading,
    addRow, duplicateRow, deleteRow, updateCell, importRows,
    addColumn, deleteColumn, renameColumn, changeColumnType,
    resizeColumn, reorderColumns, updateColumnOptions,
  } = useTransactions();

  const [showAddCol,    setShowAddCol]    = useState(false);
  const [showImport,    setShowImport]    = useState(false);
  const [importing,     setImporting]     = useState(false);
  const [importMsg,     setImportMsg]     = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [page,          setPage]          = useState(1);
  const [dateRange,     setDateRange]     = useState<'1M'|'3M'|'1Y'|'All'>('All');

  const handleFiltersChange = (f: ActiveFilter[]) => { setActiveFilters(f); setPage(1); };

  const optionMap = useMemo(() => {
    const map: Record<string,Record<string,string>> = {};
    for (const col of columns) {
      if (col.type === 'dropdown' && col.options) {
        map[col.id] = {};
        for (const opt of col.options as {id:string;label:string}[]) map[col.id][opt.id] = opt.label;
      }
    }
    return map;
  }, [columns]);

  const resolveLabel = useCallback((colId:string, val:string) => optionMap[colId]?.[val] ?? val, [optionMap]);

  const normalizeDate = (val:string) => {
    if (!val) return '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m) return `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
    return val;
  };
  const parseAmt = (v:string) => parseFloat(v.replace(/[^0-9.-]/g,'')) || 0;

  const amountCol   = useMemo(() => columns.find(c => /amount|value|price|cost/i.test(c.name)), [columns]);
  const typeCol     = useMemo(() => columns.find(c => /^type$/i.test(c.name) && c.type==='dropdown'), [columns]);
  const dateCol     = useMemo(() => columns.find(c => c.type==='date' || /date/i.test(c.name)), [columns]);
  const categoryCol = useMemo(() => columns.find(c => /categor/i.test(c.name) && c.id!==typeCol?.id), [columns, typeCol]);

  const dateFilteredRows = useMemo(() => {
    if (dateRange==='All' || !dateCol) return rows;
    const cutoff = new Date();
    if (dateRange==='1M') cutoff.setMonth(cutoff.getMonth()-1);
    if (dateRange==='3M') cutoff.setMonth(cutoff.getMonth()-3);
    if (dateRange==='1Y') cutoff.setFullYear(cutoff.getFullYear()-1);
    const cutStr = cutoff.toISOString().slice(0,10);
    return rows.filter(r => normalizeDate(r.data[dateCol.id]??'')>=cutStr);
  }, [rows, dateCol, dateRange]);

  const filteredRows = useMemo(() => applyFilters(dateFilteredRows, activeFilters), [dateFilteredRows, activeFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length/ROWS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const pageRows   = filteredRows.slice((safePage-1)*ROWS_PER_PAGE, safePage*ROWS_PER_PAGE);

  const stats = useMemo(() => {
    let income=0, expense=0;
    for (const row of filteredRows) {
      if (!amountCol) continue;
      const amt = parseAmt(row.data[amountCol.id]??'');
      if (typeCol) {
        const label = resolveLabel(typeCol.id, row.data[typeCol.id]??'').toLowerCase();
        if (/income|earn|revenue|credit|receipt/.test(label)) income += Math.abs(amt);
        else expense += Math.abs(amt);
      } else {
        if (amt>=0) income+=amt; else expense+=Math.abs(amt);
      }
    }
    return { income, expense, balance: income-expense };
  }, [filteredRows, amountCol, typeCol, resolveLabel]);

  const chartData = useMemo(() => {
    if (!dateCol || !amountCol) return [];
    const by: Record<string,{income:number;expense:number}> = {};
    for (const row of dateFilteredRows) {
      const d = normalizeDate(row.data[dateCol.id]??'');
      if (!d) continue;
      const mo = d.slice(0,7);
      if (!by[mo]) by[mo]={income:0,expense:0};
      const amt = parseAmt(row.data[amountCol.id]??'');
      if (typeCol) {
        const label = resolveLabel(typeCol.id, row.data[typeCol.id]??'').toLowerCase();
        if (/income|earn|revenue|credit/.test(label)) by[mo].income+=Math.abs(amt);
        else by[mo].expense+=Math.abs(amt);
      } else {
        if (amt>=0) by[mo].income+=amt; else by[mo].expense+=Math.abs(amt);
      }
    }
    return Object.entries(by).sort(([a],[b])=>a.localeCompare(b)).slice(-12).map(([mo,v])=>({
      label: new Date(mo+'-01').toLocaleDateString('en',{month:'short',year:'2-digit'}), ...v
    }));
  }, [dateFilteredRows, dateCol, amountCol, typeCol, resolveLabel]);

  const catData = useMemo(() => {
    if (!categoryCol || !amountCol) return [];
    const by: Record<string,number> = {};
    for (const row of filteredRows) {
      const cat = resolveLabel(categoryCol.id, row.data[categoryCol.id]??'')||'Other';
      by[cat] = (by[cat]??0)+Math.abs(parseAmt(row.data[amountCol.id]??''));
    }
    return Object.entries(by).sort(([,a],[,b])=>b-a).slice(0,8);
  }, [filteredRows, categoryCol, amountCol, resolveLabel]);

  const fmt = (n:number) => n.toLocaleString('en',{minimumFractionDigits:2,maximumFractionDigits:2});

  const handleExport = () => {
    const h = columns.map(c=>`"${c.name}"`).join(',');
    const lines = filteredRows.map(r=>columns.map(c=>`"${(r.data[c.id]??'').replace(/"/g,'""')}"`).join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[h,...lines].join('\n')],{type:'text/csv'}));
    a.download='transactions.csv'; a.click();
  };

  const moveLeft  = (id:string) => { const i=columns.findIndex(c=>c.id===id); if(i>0) reorderColumns(id,columns[i-1].id,'before'); };
  const moveRight = (id:string) => { const i=columns.findIndex(c=>c.id===id); if(i<columns.length-1) reorderColumns(id,columns[i+1].id,'after'); };
  const dupColumn = (id:string) => { const src=columns.find(c=>c.id===id); if(!src) return; addColumn(`${src.name} (copy)`,src.type as ColumnType,src.options?.map(o=>({label:o.label,color:o.color}))??[]); };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
      <span className="text-sm text-slate-500">Loading transactions...</span>
    </div>
  );

  return (
    <div className="space-y-5 w-full">
      <PageHeader title="Transactions" subtitle={`${rows.length.toLocaleString()} rows · ${columns.length} columns`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={()=>setShowImport(true)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors" style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
              <Upload size={14}/> Import
            </button>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors" style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
              <Download size={14}/> Export
            </button>
            <button onClick={()=>setShowAddCol(true)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors" style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
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
            {label:'Total Income', val:stats.income, icon:<TrendingUp size={15}/>, cls:'bg-emerald-50 border-emerald-200 text-emerald-700'},
            {label:'Total Expense',val:stats.expense,icon:<TrendingDown size={15}/>,cls:'bg-red-50 border-red-200 text-red-500'},
            {label:'Net Balance',  val:stats.balance,icon:<DollarSign size={15}/>, cls:stats.balance>=0?'bg-blue-50 border-blue-200 text-blue-600':'bg-red-50 border-red-200 text-red-500'},
          ].map(({label,val,icon,cls})=>(
            <div key={label} className={`${cls} border rounded-2xl p-4`} style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
              <div className="flex items-center gap-1.5 mb-2 opacity-80">{icon}<span className="text-xs font-bold uppercase tracking-wide">{label}</span></div>
              <p className="text-2xl font-bold" style={{fontFamily:"'Space Grotesk',sans-serif"}}>{fmt(val)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length>0 && (
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
      {catData.length>0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          <h3 className="text-sm font-bold text-slate-800 mb-3" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Top Categories</h3>
          <div className="space-y-2">
            {catData.map(([cat,amt],i)=>{
              const pct=Math.round((amt/catData[0][1])*100);
              const colors=['bg-blue-500','bg-violet-500','bg-emerald-500','bg-amber-500','bg-red-400','bg-cyan-500','bg-pink-500','bg-orange-500'];
              return (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-28 truncate flex-shrink-0">{cat}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2"><div className={`${colors[i%colors.length]} h-2 rounded-full`} style={{width:`${pct}%`}}/></div>
                  <span className="text-xs font-semibold text-slate-700 w-20 text-right tabular-nums">{fmt(amt)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      {columns.length>0 && (
        <ColumnFilters columns={columns} activeFilters={activeFilters} onFiltersChange={handleFiltersChange} optionMap={optionMap}/>
      )}

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-sm text-slate-500">
        <span><strong className="text-slate-800">{filteredRows.length.toLocaleString()}</strong> rows{activeFilters.length>0?` of ${rows.length.toLocaleString()} total`:''}</span>
        {columns.length>0 && <><span className="text-slate-300">|</span><span><strong className="text-slate-800">{columns.length}</strong> columns</span></>}
        <span className="ml-auto text-xs text-slate-400 hidden md:block">Right-click column header for options · Drag to reorder</span>
      </div>

      {/* Table */}
      {columns.length===0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 gap-3">
          <BarChart2 size={36} className="text-slate-200"/>
          <p className="text-sm font-semibold text-slate-500">No columns yet</p>
          <p className="text-xs text-slate-400">Click <strong>Add Column</strong> to build your transaction table</p>
          <button onClick={()=>setShowAddCol(true)} className="mt-2 flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
            <Plus size={14}/> Add Column
          </button>
        </div>
      ) : (
        <ProposalTable
          columns={columns}
          rows={pageRows}
          hideId={true}
          hideActions={false}
          searchHighlight=""
          onUpdateCell={updateCell}
          onDuplicateRow={duplicateRow}
          onDeleteRow={deleteRow}
          onRenameColumn={renameColumn}
          onChangeColumnType={changeColumnType}
          onDeleteColumn={deleteColumn}
          onDuplicateColumn={dupColumn}
          onReorderColumns={reorderColumns}
          onResizeColumn={resizeColumn}
          onMoveLeft={moveLeft}
          onMoveRight={moveRight}
          onUpdateColumnOptions={updateColumnOptions}
        />
      )}

      {/* Pagination */}
      {totalPages>1 && (
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
          onAdd={(name,type,options)=>{addColumn(name,type as ColumnType,options);setShowAddCol(false);}}
          onClose={()=>setShowAddCol(false)}
        />
      )}

      {showImport && (
        <ImportModal columns={columns} existingRows={rows}
          onImport={async(newRows,mode)=>{
            setShowImport(false); setImporting(true);
            setImportMsg(`Saving ${newRows.length} rows...`);
            try {
              await importRows(newRows as Omit<Row,'id'|'created_at'>[], mode);
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
