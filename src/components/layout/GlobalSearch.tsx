import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, FileText, ExternalLink } from 'lucide-react';
import { useProposals } from '../../context/ProposalContext';
import { getFunnelStatusStyle } from '../../types/proposals';
import type { PageId } from '../../App';

interface GlobalSearchProps {
  onNavigate: (page: PageId) => void;
}

interface SearchResult {
  rowId: string;
  displayId: string;
  matches: { colName: string; value: string; isLink: boolean }[];
  statusLabel: string;
  statusColor: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ onNavigate }) => {
  const { columns, rows, loading } = useProposals();
  const [query,   setQuery]   = useState('');
  const [open,    setOpen]    = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef   = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build option label map for resolving dropdown IDs
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

  // Find status column
  const statusCol = useMemo(() =>
    columns.find(c => c.type === 'dropdown' && c.name.toLowerCase().includes('status')),
    [columns]
  );

  // Search logic
  const results = useMemo((): SearchResult[] => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const matches: SearchResult[] = [];

    for (const row of rows) {
      const rowMatches: SearchResult['matches'] = [];

      // Check display_id
      if (row.display_id?.toLowerCase().includes(q)) {
        rowMatches.push({ colName: 'ID', value: row.display_id, isLink: false });
      }

      // Check all column values
      for (const col of columns) {
        const rawVal = row.data[col.id] ?? '';
        if (!rawVal) continue;

        // Resolve label for dropdowns
        const displayVal = optionMap[col.id]?.[rawVal] ?? rawVal;

        if (displayVal.toLowerCase().includes(q) || rawVal.toLowerCase().includes(q)) {
          // Don't duplicate ID match
          if (col.name === 'ID') continue;
          rowMatches.push({
            colName: col.name,
            value: displayVal,
            isLink: col.type === 'link',
          });
        }
      }

      if (rowMatches.length > 0) {
        // Get status
        const rawStatus = statusCol ? (row.data[statusCol.id] ?? '') : '';
        const statusLabel = statusCol ? (optionMap[statusCol.id]?.[rawStatus] ?? rawStatus) : '';
        const statusStyle = getFunnelStatusStyle(statusLabel);

        matches.push({
          rowId: row.id,
          displayId: row.display_id ?? '',
          matches: rowMatches.slice(0, 3), // max 3 match highlights per row
          statusLabel,
          statusColor: statusStyle.text,
        });
      }

      if (matches.length >= 20) break; // max 20 results
    }

    return matches;
  }, [query, rows, columns, optionMap, statusCol]);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Open on Ctrl+K / Cmd+K
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  const handleFocus = () => { setFocused(true); if (query.length >= 2) setOpen(true); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setOpen(e.target.value.length >= 2);
  };

  const handleResultClick = () => {
    onNavigate('proposals');
    setOpen(false);
    setQuery('');
  };

  const highlight = (text: string, q: string) => {
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return <span>{text}</span>;
    return (
      <span>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 text-yellow-900 rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </span>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <div className={`flex items-center gap-2 bg-slate-50 border rounded-xl px-3 py-2 w-72 transition-all ${
        focused ? 'border-blue-300 bg-white shadow-sm' : 'border-slate-200'
      }`}>
        <Search size={15} className="text-slate-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={() => setFocused(false)}
          placeholder="Search anything..."
          className="bg-transparent text-sm text-slate-600 placeholder-slate-400 outline-none w-full"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} className="text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        )}
        <kbd className="hidden lg:block text-xs text-slate-300 border border-slate-200 rounded px-1.5 py-0.5 font-mono flex-shrink-0">
          ⌘K
        </kbd>
      </div>

      {/* Dropdown results */}
      {open && query.length >= 2 && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-slate-200 rounded-2xl shadow-2xl z-[9999] overflow-hidden"
          style={{ width: 420, maxHeight: 480, boxShadow: '0 16px 48px rgba(0,0,0,0.16)' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500">
              {loading ? 'Loading...' : results.length === 0 ? 'No results' : `${results.length} result${results.length !== 1 ? 's' : ''} in Proposal Details`}
            </p>
            <p className="text-xs text-slate-400">Press Esc to close</p>
          </div>

          {/* No results */}
          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Search size={24} className="text-slate-200" />
              <p className="text-sm text-slate-400">No results for "<strong>{query}</strong>"</p>
              <p className="text-xs text-slate-300">Try searching by ID, title, name, or link</p>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
              {results.map(result => (
                <button key={result.rowId}
                  onClick={handleResultClick}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 text-left">

                  {/* Icon */}
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText size={14} className="text-blue-500" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                        {result.displayId}
                      </span>
                      {result.statusLabel && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getFunnelStatusStyle(result.statusLabel).full}`}>
                          {result.statusLabel}
                        </span>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {result.matches.map((m, i) => (
                        <div key={i} className="flex items-start gap-1.5 min-w-0">
                          <span className="text-xs text-slate-400 flex-shrink-0 w-20 truncate">{m.colName}:</span>
                          <span className="text-xs text-slate-700 truncate flex items-center gap-1">
                            {highlight(m.value, query)}
                            {m.isLink && <ExternalLink size={10} className="text-blue-400 flex-shrink-0" />}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </button>
              ))}

              {results.length >= 20 && (
                <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100">
                  <p className="text-xs text-slate-400 text-center">Showing top 20 results — refine your search</p>
                </div>
              )}
            </div>
          )}

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <kbd className="border border-slate-200 rounded px-1 py-0.5 font-mono text-xs">↵</kbd>
              <span>Go to Proposal Details</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
