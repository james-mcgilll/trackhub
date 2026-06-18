import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, FileText, BarChart2, Star, TrendingUp } from 'lucide-react';
import { useProposals } from '../../context/ProposalContext';
import { getFunnelStatusStyle } from '../../types/proposals';
import type { PageId } from '../../App';

interface GlobalSearchProps {
  onNavigate: (page: PageId, highlight?: string) => void;
}

interface SearchResult {
  module: PageId;
  moduleLabel: string;
  moduleIcon: React.ReactNode;
  rowId: string;
  displayId: string;
  matchedField: string;
  matchedValue: string;
  statusLabel: string;
}

const MODULE_META: Partial<Record<PageId, { label: string; icon: React.ReactNode }>> = {
  'proposals':           { label: 'Proposal Details',    icon: <FileText size={13} />   },
  'lead-analysis':       { label: 'Lead Analysis',       icon: <TrendingUp size={13} /> },
  'lead-prioritization': { label: 'Lead Prioritization', icon: <Star size={13} />       },
  'reporting':           { label: 'Reporting',           icon: <BarChart2 size={13} />  },
};

function highlight(text: string, q: string) {
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <span className="truncate">{text}</span>;
  return (
    <span className="truncate">
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 text-yellow-900 rounded-sm px-0.5 not-italic">{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </span>
  );
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
  const { columns, rows } = useProposals();
  const [query,   setQuery]   = useState('');
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build option label map
  const optionMap = useMemo(() => {
    const map: Record<string, Record<string, string>> = {};
    for (const col of columns) {
      if (col.type === 'dropdown' && col.options) {
        map[col.id] = {};
        for (const opt of col.options as {id:string;label:string}[]) {
          map[col.id][opt.id] = opt.label;
        }
      }
    }
    return map;
  }, [columns]);

  const statusCol = useMemo(() =>
    columns.find(c => c.type === 'dropdown' && c.name.toLowerCase().includes('status')),
    [columns]
  );

  // Search across modules
  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const found: SearchResult[] = [];
    const seen = new Set<string>(); // deduplicate rowId+module

    for (const row of rows) {
      // Check display_id
      const idMatch = row.display_id?.toLowerCase().includes(q);
      let matchedField = '';
      let matchedValue = '';

      if (idMatch) {
        matchedField = 'Unique ID';
        matchedValue = row.display_id ?? '';
      } else {
        // Check columns
        for (const col of columns) {
          const raw = row.data[col.id] ?? '';
          const label = optionMap[col.id]?.[raw] ?? raw;
          if (label.toLowerCase().includes(q)) {
            matchedField = col.name;
            matchedValue = label;
            break;
          }
        }
      }

      if (!matchedField) continue;

      // Get status
      const rawStatus = statusCol ? (row.data[statusCol.id] ?? '') : '';
      const statusLabel = statusCol ? (optionMap[statusCol.id]?.[rawStatus] ?? rawStatus) : '';

      // Determine which modules this row appears in
      const modules: PageId[] = ['proposals'];

      // Also appears in Lead Analysis if status is qualifying
      const qualifyingStages = ['contacted', 'interviewed', 'hired'];
      if (qualifyingStages.includes(statusLabel.toLowerCase())) {
        modules.push('lead-analysis');
      }

      for (const mod of modules) {
        const key = `${row.id}-${mod}`;
        if (seen.has(key)) continue;
        seen.add(key);

        found.push({
          module: mod,
          moduleLabel: MODULE_META[mod]?.label ?? mod,
          moduleIcon: MODULE_META[mod]?.icon,
          rowId: row.id,
          displayId: row.display_id ?? '',
          matchedField,
          matchedValue,
          statusLabel,
        });
      }

      if (found.length >= 30) break;
    }

    // Group by module
    return found.sort((a, b) => a.module.localeCompare(b.module));
  }, [query, rows, columns, optionMap, statusCol]);

  // Group results by module
  const grouped = useMemo(() => {
    const g: Record<string, SearchResult[]> = {};
    for (const r of results) {
      if (!g[r.module]) g[r.module] = [];
      g[r.module].push(r);
    }
    return g;
  }, [results]);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Ctrl/Cmd+K shortcut
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); setOpen(true); }
      if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(e.target.value.length >= 2);
  };

  const handleClick = (result: SearchResult) => {
    onNavigate(result.module, query.trim());
    setOpen(false);
    setQuery('');
  };

  const totalResults = results.length;

  return (
    <div ref={containerRef} className="relative">
      {/* Input */}
      <div className={`flex items-center gap-2 bg-slate-50 border rounded-xl px-3 py-2 w-72 transition-all ${focused ? 'border-blue-300 bg-white shadow-sm' : 'border-slate-200'}`}>
        <Search size={15} className="text-slate-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => { setFocused(true); if (query.length >= 2) setOpen(true); }}
          onBlur={() => setFocused(false)}
          placeholder="Search anything..."
          className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none w-full"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }}>
            <X size={14} className="text-slate-400 hover:text-slate-600" />
          </button>
        )}
        <kbd className="hidden lg:block text-xs text-slate-300 border border-slate-200 rounded px-1.5 py-0.5 font-mono flex-shrink-0">⌘K</kbd>
      </div>

      {/* Dropdown */}
      {open && query.length >= 2 && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden"
          style={{ width: 460, maxHeight: 520, boxShadow: '0 16px 48px rgba(0,0,0,0.16)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500">
              {totalResults === 0 ? 'No results' : `${totalResults} result${totalResults !== 1 ? 's' : ''} across ${Object.keys(grouped).length} module${Object.keys(grouped).length !== 1 ? 's' : ''}`}
            </p>
            <p className="text-xs text-slate-400">Esc to close</p>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 440 }}>
            {totalResults === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Search size={28} className="text-slate-200" />
                <p className="text-sm text-slate-400">No results for "<strong>{query}</strong>"</p>
                <p className="text-xs text-slate-300">Try ID, name, title, link, or status</p>
              </div>
            ) : (
              Object.entries(grouped).map(([mod, modResults]) => (
                <div key={mod}>
                  {/* Module header */}
                  <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 border-b border-slate-100 sticky top-0">
                    <span className="text-slate-400">{MODULE_META[mod as PageId]?.icon}</span>
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                      {MODULE_META[mod as PageId]?.label}
                    </span>
                    <span className="ml-auto text-xs text-slate-400">{modResults.length} match{modResults.length !== 1 ? 'es' : ''}</span>
                  </div>

                  {/* Results */}
                  {modResults.slice(0, 8).map((result, i) => {
                    const statusStyle = result.statusLabel ? getFunnelStatusStyle(result.statusLabel) : null;
                    return (
                      <button key={`${result.rowId}-${i}`}
                        onClick={() => handleClick(result)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 text-left">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <FileText size={13} className="text-blue-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-mono font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                              {result.displayId}
                            </span>
                            {statusStyle && result.statusLabel && (
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${statusStyle.full}`}>
                                {result.statusLabel}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs min-w-0">
                            <span className="text-slate-400 flex-shrink-0">{result.matchedField}:</span>
                            <span className="text-slate-700 min-w-0">{highlight(result.matchedValue, query)}</span>
                          </div>
                        </div>
                        <span className="text-xs text-blue-500 flex-shrink-0 font-medium">Open →</span>
                      </button>
                    );
                  })}
                  {modResults.length > 8 && (
                    <button onClick={() => { onNavigate(mod as PageId, query.trim()); setOpen(false); setQuery(''); }}
                      className="w-full px-4 py-2 text-xs text-blue-600 hover:bg-blue-50 text-center font-medium border-b border-slate-50">
                      View all {modResults.length} results in {MODULE_META[mod as PageId]?.label} →
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
