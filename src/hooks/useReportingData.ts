import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';
import type { Column, Row } from '../types/proposals';

// Fetch ALL rows + columns directly from Supabase with pagination
export function useReportingData() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows,    setRows]    = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string>('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch columns
      const { data: colData } = await supabase
        .from('proposal_columns').select('*').order('order');
      if (colData) setColumns(colData as Column[]);

      // Fetch ALL rows with pagination
      let allRows: Row[] = [];
      const PAGE = 1000;
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('proposal_rows')
          .select('id, display_id, data, created_at')
          .range(from, from + PAGE - 1);
        if (error || !data || data.length === 0) break;
        allRows = [...allRows, ...data as Row[]];
        if (data.length < PAGE) break;
        from += PAGE;
      }
      setRows(allRows);
      setLastSync(new Date().toLocaleTimeString());
    } catch (e) {
      console.warn('Reporting fetch failed, using localStorage fallback');
      // Fallback to localStorage
      try {
        const lsCols = localStorage.getItem('trackhub_proposal_columns_v2');
        const lsRows = localStorage.getItem('trackhub_proposal_rows_v2');
        if (lsCols) setColumns(JSON.parse(lsCols));
        if (lsRows) setRows(JSON.parse(lsRows));
      } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime refresh
  useEffect(() => {
    const ch = supabase.channel('reporting_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'proposal_rows' },
        () => setTimeout(() => fetchAll(), 2000)
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  return { columns, rows, loading, lastSync, refetch: fetchAll };
}
