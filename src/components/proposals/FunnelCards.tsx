import React, { useMemo } from 'react';
import type { Column, Row } from '../../types/proposals';

// ── Funnel definition ─────────────────────────────────────────────────────────
// Order matters — each stage is cumulative (includes all stages at or above it)
const FUNNEL_STAGES = [
  { label: 'Submitted',   color: 'blue',   bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-700',   dot: 'bg-blue-500',   bar: 'bg-blue-500'   },
  { label: 'Viewed',      color: 'purple', bg: 'bg-violet-50',  border: 'border-violet-200', text: 'text-violet-700', dot: 'bg-violet-500', bar: 'bg-violet-500' },
  { label: 'Contacted',   color: 'amber',  bg: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-700',  dot: 'bg-amber-500',  bar: 'bg-amber-500'  },
  { label: 'Interviewed', color: 'orange', bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500', bar: 'bg-orange-500' },
  { label: 'Hired',       color: 'green',  bg: 'bg-emerald-50', border: 'border-emerald-200',text: 'text-emerald-700',dot: 'bg-emerald-500',bar: 'bg-emerald-500'},
];

interface FunnelCardsProps {
  columns: Column[];
  rows: Row[];
  onFilterByStatus?: (optionId: string | null) => void;
  activeFilter?: string | null;
}

export const FunnelCards: React.FC<FunnelCardsProps> = ({
  columns, rows, onFilterByStatus, activeFilter,
}) => {
  // Find the "Proposal Status" column (or any dropdown with the funnel stage labels)
  const statusCol = useMemo(() => {
    // First try exact name match
    let col = columns.find(c =>
      c.type === 'dropdown' &&
      c.name.toLowerCase().includes('proposal status') || 
      c.name.toLowerCase() === 'status'
    );
    // Fallback: find any dropdown that has at least 3 of the funnel stage labels
    if (!col) {
      col = columns.find(c => {
        if (c.type !== 'dropdown' || !c.options) return false;
        const labels = c.options.map(o => o.label.toLowerCase());
        const matches = FUNNEL_STAGES.filter(s => labels.includes(s.label.toLowerCase()));
        return matches.length >= 2;
      });
    }
    return col ?? null;
  }, [columns]);

  // Map option label -> option id for this column
  const optionsByLabel = useMemo(() => {
    if (!statusCol?.options) return {};
    const map: Record<string, string> = {};
    for (const opt of statusCol.options) {
      map[opt.label.toLowerCase()] = opt.id;
    }
    return map;
  }, [statusCol]);

  // Funnel index: stage order (Submitted=0, Viewed=1, Contacted=2, Interviewed=3, Hired=4)
  const stageIndex = useMemo(() => {
    const idx: Record<string, number> = {};
    FUNNEL_STAGES.forEach((s, i) => {
      const optId = optionsByLabel[s.label.toLowerCase()];
      if (optId) idx[optId] = i;
    });
    return idx;
  }, [optionsByLabel]);

  // Count rows per funnel stage — CUMULATIVE
  // A row at stage N counts for stages 0..N
  const counts = useMemo(() => {
    if (!statusCol) return FUNNEL_STAGES.map(() => 0);

    // First pass: find the highest stage index each row has reached
    const rowStages: number[] = rows.map(row => {
      const val = row.data[statusCol.id] ?? '';
      return stageIndex[val] ?? -1; // -1 = no status set
    });

    // Second pass: for each stage, count rows that reached AT LEAST that stage
    return FUNNEL_STAGES.map((_, stageIdx) =>
      rowStages.filter(s => s >= stageIdx).length
    );
  }, [rows, statusCol, stageIndex]);

  const totalRows = rows.length;
  const maxCount  = counts[0] || 1; // Submitted is always the biggest

  if (!statusCol) return null; // No status column found — don't show cards

  return (
    <div className="w-full">
      {/* Stage cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {FUNNEL_STAGES.map((stage, i) => {
          const count      = counts[i];
          const pct        = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
          const optId      = optionsByLabel[stage.label.toLowerCase()];
          const isActive   = activeFilter === optId;
          const isClickable = !!onFilterByStatus && !!optId;

          // Conversion rate vs previous stage
          const prevCount  = i === 0 ? totalRows : counts[i - 1];
          const conversion = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;

          return (
            <button
              key={stage.label}
              onClick={() => isClickable && onFilterByStatus(isActive ? null : optId)}
              disabled={!isClickable}
              className={`
                relative rounded-2xl border p-4 text-left transition-all
                ${isActive
                  ? `${stage.bg} ${stage.border} shadow-md ring-2 ring-offset-1 ring-${stage.color}-400`
                  : `bg-white border-slate-100 hover:border-slate-200 hover:shadow-md`
                }
                ${isClickable ? 'cursor-pointer' : 'cursor-default'}
              `}
              style={{ boxShadow: isActive ? undefined : '0 1px 4px rgba(0,0,0,0.04)' }}
            >
              {/* Funnel arrow connector */}
              {i < FUNNEL_STAGES.length - 1 && (
                <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 z-10 hidden lg:block">
                  <svg viewBox="0 0 12 12" className="text-slate-300">
                    <path d="M2 2 L10 6 L2 10 Z" fill="currentColor" />
                  </svg>
                </div>
              )}

              {/* Stage dot + label */}
              <div className="flex items-center gap-1.5 mb-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${stage.dot}`} />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">
                  {stage.label}
                </span>
              </div>

              {/* Count */}
              <p
                className={`text-3xl font-bold leading-none mb-1 ${isActive ? stage.text : 'text-slate-800'}`}
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                {count.toLocaleString()}
              </p>

              {/* Percentage of total */}
              <p className="text-xs text-slate-400 mb-3">
                {pct}% of submitted
              </p>

              {/* Progress bar */}
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${stage.bar}`}
                  style={{ width: `${pct}%`, opacity: 0.7 }}
                />
              </div>

              {/* Conversion from previous stage */}
              {i > 0 && count > 0 && (
                <p className="text-xs text-slate-400 mt-2">
                  {conversion}% from {FUNNEL_STAGES[i - 1].label.toLowerCase()}
                </p>
              )}
            </button>
          );
        })}
      </div>

      {/* Active filter indicator */}
      {activeFilter && onFilterByStatus && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-xs text-slate-500">
            Filtering by: <strong className="text-slate-700">
              {FUNNEL_STAGES.find(s => optionsByLabel[s.label.toLowerCase()] === activeFilter)?.label}
            </strong>
            {' '}— showing rows at this stage or beyond
          </span>
          <button
            onClick={() => onFilterByStatus(null)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium underline"
          >
            Clear filter
          </button>
        </div>
      )}
    </div>
  );
};
