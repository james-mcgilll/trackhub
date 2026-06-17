import React, { useState, useMemo } from 'react';
import { Calendar, SkipForward, Filter, BarChart2 } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { BarChart, DayNoteModal } from '../components/reporting/BarChart';
import { useProposalTable } from '../hooks/useProposalTable';
import { useDayNotes } from '../hooks/useDayNotes';
import {
  FUNNEL_STAGES, STAGE_COLORS,
  getPresetRange, getDatesInRange, formatDisplayDate,
  detectDateCol, detectStatusCol, detectDropdownCols,
  buildChartData,
} from '../types/reporting';
import type { RangePreset, DateRange } from '../types/reporting';

const PRESET_LABELS: { value: RangePreset; label: string }[] = [
  { value: 'last7',     label: 'Last 7 days'  },
  { value: 'last30',    label: 'Last 30 days'  },
  { value: 'last90',    label: 'Last 90 days'  },
  { value: 'thisMonth', label: 'This month'    },
  { value: 'lastMonth', label: 'Last month'    },
  { value: 'thisYear',  label: 'This year'     },
  { value: 'lastYear',  label: 'Last year'     },
  { value: 'custom',    label: 'Custom range'  },
];

// Generate distinct colors for non-funnel groupings (SDR, Profile, etc.)
const AUTO_COLORS = [
  '#3b82f6','#f59e0b','#8b5cf6','#06b6d4','#10b981',
  '#f43f5e','#84cc16','#f97316','#6366f1','#14b8a6',
  '#ec4899','#a855f7','#22d3ee','#fb923c','#4ade80',
];

export const ReportingPage: React.FC = () => {
  const { columns, rows } = useProposalTable();
  const { notes, getNote, setNote, deleteNote } = useDayNotes();

  // ── Date range ──────────────────────────────────────────────────────────────
  const [preset,    setPreset]    = useState<RangePreset>('last30');
  const [custom,    setCustom]    = useState<DateRange>({ from: '', to: '' });
  const [skipWeekends, setSkipWeekends] = useState(false);

  const range = preset === 'custom' ? custom : getPresetRange(preset);
  const dates = useMemo(() =>
    range.from && range.to ? getDatesInRange(range.from, range.to, skipWeekends) : [],
    [range.from, range.to, skipWeekends]
  );

  // ── Column detection ────────────────────────────────────────────────────────
  const dateCol   = useMemo(() => detectDateCol(columns),   [columns]);
  const statusCol = useMemo(() => detectStatusCol(columns), [columns]);
  const dropdowns = useMemo(() => detectDropdownCols(columns), [columns]);

  // ── Group by selector ────────────────────────────────────────────────────────
  // What to split the bars by: status, SDR, profile, etc.
  const [groupColId, setGroupColId] = useState<string>('__status__');

  // The actual column used for grouping
  const groupCol = useMemo(() => {
    if (groupColId === '__status__') return statusCol;
    return columns.find(c => c.id === groupColId) ?? null;
  }, [groupColId, statusCol, columns]);

  // ── Filter: which statuses to include ────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<string[]>([]); // empty = all

  // ── Series: which values to show as bars ─────────────────────────────────────
  // For status grouping: use funnel stages. For others: use all option values.
  const allSeries = useMemo(() => {
    if (!groupCol?.options) return [];
    if (groupColId === '__status__') {
      // Show funnel stages in order
      return FUNNEL_STAGES
        .map(label => groupCol.options?.find(o => o.label === label))
        .filter(Boolean)
        .map(o => ({ id: o!.id, label: o!.label }));
    }
    return groupCol.options.map((o: {id: string; label: string}) => ({ id: o.id, label: o.label }));
  }, [groupCol, groupColId]);

  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const visibleSeries = allSeries.filter(s => !hiddenSeries.has(s.label));

  // Colors for series
  const seriesColors = useMemo(() => {
    const map: Record<string, string> = {};
    allSeries.forEach((s: {id:string;label:string}, i: number) => {
      map[s.label] = groupColId === '__status__'
        ? (STAGE_COLORS[s.label] ?? AUTO_COLORS[i % AUTO_COLORS.length])
        : AUTO_COLORS[i % AUTO_COLORS.length];
    });
    return map;
  }, [allSeries, groupColId]);

  // ── Chart data ───────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (!dateCol || !groupCol || dates.length === 0) return [];
    const filterColId  = statusFilter.length > 0 ? statusCol?.id : undefined;
    const filterValues = statusFilter.length > 0 ? statusFilter : undefined;
    return buildChartData(rows, dates, dateCol.id, groupCol.id, visibleSeries, filterColId, filterValues);
  }, [rows, dates, dateCol, groupCol, visibleSeries, statusFilter, statusCol]);

  // ── Summary stats ─────────────────────────────────────────────────────────────
  const totalByLabel = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const day of chartData) {
      for (const [label, count] of Object.entries(day.counts)) {
        totals[label] = (totals[label] ?? 0) + count;
      }
    }
    return totals;
  }, [chartData]);

  const grandTotal = Object.values(totalByLabel).reduce((a, b) => a + b, 0);

  // ── Day note modal ────────────────────────────────────────────────────────────
  const [noteDate, setNoteDate] = useState<string | null>(null);

  // ── No data guard ─────────────────────────────────────────────────────────────
  const hasData = rows.length > 0 && dateCol && groupCol;

  return (
    <div className="space-y-5 max-w-screen-2xl">
      <PageHeader
        title="Reporting"
        subtitle="Daily submission trends and pipeline activity."
      />

      {!dateCol && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          No date column detected. Make sure your Proposal Details table has a Date column (e.g. "Submission Date").
        </div>
      )}

      {/* ── Controls bar ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 flex flex-wrap items-center gap-3"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

        {/* Date range preset */}
        <div className="flex items-center gap-1.5">
          <Calendar size={14} className="text-slate-400" />
          <select value={preset} onChange={e => setPreset(e.target.value as RangePreset)}
            className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400 bg-white cursor-pointer font-medium">
            {PRESET_LABELS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        {/* Custom date range */}
        {preset === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={custom.from} onChange={e => setCustom(p => ({ ...p, from: e.target.value }))}
              className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-blue-400" />
            <span className="text-xs text-slate-400">to</span>
            <input type="date" value={custom.to} onChange={e => setCustom(p => ({ ...p, to: e.target.value }))}
              className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs outline-none focus:border-blue-400" />
          </div>
        )}

        <div className="w-px h-5 bg-slate-200 hidden sm:block" />

        {/* Group by */}
        <div className="flex items-center gap-1.5">
          <BarChart2 size={14} className="text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Group by</span>
          <select value={groupColId} onChange={e => { setGroupColId(e.target.value); setHiddenSeries(new Set()); }}
            className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400 bg-white cursor-pointer font-medium">
            {statusCol && <option value="__status__">Proposal Status</option>}
            {dropdowns
              .filter(c => c.id !== statusCol?.id)
              .map(c => <option key={c.id} value={c.id}>{c.name}</option>)
            }
          </select>
        </div>

        {/* Filter by status (only when grouping by something else) */}
        {groupColId !== '__status__' && statusCol && (
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Status</span>
            <select
              multiple={false}
              value={statusFilter[0] ?? ''}
              onChange={e => setStatusFilter(e.target.value ? [e.target.value] : [])}
              className="border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400 bg-white cursor-pointer font-medium"
            >
              <option value="">All statuses</option>
              {(statusCol.options as any[])?.map((o: any) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          </div>
        )}

        <div className="w-px h-5 bg-slate-200 hidden sm:block" />

        {/* Skip weekends */}
        <label className="flex items-center gap-1.5 cursor-pointer select-none">
          <div
            onClick={() => setSkipWeekends(s => !s)}
            className={`w-8 h-4 rounded-full transition-colors relative ${skipWeekends ? 'bg-blue-600' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${skipWeekends ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
            <SkipForward size={12} className="text-slate-400" /> Skip weekends
          </span>
        </label>

        {/* Range info */}
        <span className="ml-auto text-xs text-slate-400 hidden md:block">
          {dates.length} {skipWeekends ? 'working ' : ''}days · {grandTotal} total
        </span>
      </div>

      {/* ── Summary cards ── */}
      {visibleSeries.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {visibleSeries.map((s: {id:string;label:string}) => {
            const count = totalByLabel[s.label] ?? 0;
            const color = seriesColors[s.label];
            const pct = grandTotal > 0 ? Math.round((count / grandTotal) * 100) : 0;
            return (
              <div key={s.label}
                className="bg-white rounded-2xl border border-slate-100 p-4"
                style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">{s.label}</span>
                </div>
                <p className="text-2xl font-bold text-slate-800 leading-none"
                  style={{ fontFamily: "'Space Grotesk', sans-serif", color }}>
                  {count.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1">{pct}% of total</p>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Chart ── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5"
        style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>

        {/* Chart header */}
        <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
          <div>
            <h3 className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Daily Activity
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {range.from && range.to ? `${formatDisplayDate(range.from)} — ${formatDisplayDate(range.to)}` : ''}
              {' · '}Click any bar to add a note
            </p>
          </div>

          {/* Legend with toggle */}
          <div className="flex flex-wrap gap-2">
            {allSeries.map((s: {id:string;label:string}) => {
              const hidden = hiddenSeries.has(s.label);
              return (
                <button key={s.label}
                  onClick={() => setHiddenSeries(prev => {
                    const next = new Set(prev);
                    if (next.has(s.label)) next.delete(s.label);
                    else next.add(s.label);
                    return next;
                  })}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                    hidden ? 'opacity-40 bg-white border-slate-200 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: hidden ? '#cbd5e1' : seriesColors[s.label] }} />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chart */}
        {!hasData ? (
          <div className="flex items-center justify-center h-48 text-sm text-slate-400">
            {rows.length === 0 ? 'No proposal data yet' : 'Configure a date column to enable reporting'}
          </div>
        ) : chartData.every(d => d.total === 0) ? (
          <div className="flex items-center justify-center h-48 text-sm text-slate-400">
            No data for the selected range
          </div>
        ) : (
          <BarChart
            data={chartData}
            seriesKeys={visibleSeries.map(s => s.label)}
            seriesColors={seriesColors}
            height={320}
            skipWeekends={skipWeekends}
            notes={notes}
            onNoteClick={date => setNoteDate(date)}
          />
        )}
      </div>

      {/* ── Notes list ── */}
      {Object.keys(notes).length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <h3 className="text-sm font-bold text-slate-700 mb-3">Day Notes</h3>
          <div className="space-y-2">
            {Object.values(notes)
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(note => (
                <div key={note.date} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl group">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-amber-700">{formatDisplayDate(note.date)}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{note.text}</p>
                  </div>
                  <button onClick={() => setNoteDate(note.date)}
                    className="opacity-0 group-hover:opacity-100 text-xs text-slate-400 hover:text-slate-600 transition-all">
                    Edit
                  </button>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* Day note modal */}
      {noteDate && (
        <DayNoteModal
          date={noteDate}
          existing={getNote(noteDate)?.text ?? ''}
          onSave={text => setNote(noteDate, text)}
          onDelete={() => deleteNote(noteDate)}
          onClose={() => setNoteDate(null)}
        />
      )}
    </div>
  );
};
