import { useState, useCallback, useEffect } from 'react';
import type { DayMarker, MarkerType } from '../components/reporting/LineChart';

const LS_KEY = 'trackhub_day_markers_v1';

function load(): Record<string, DayMarker> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}'); } catch { return {}; }
}
function save(m: Record<string, DayMarker>) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(m)); } catch {}
}

export function useDayMarkers() {
  const [markers, setMarkers] = useState<Record<string, DayMarker>>(load);
  useEffect(() => { save(markers); }, [markers]);

  const setMarker = useCallback((date: string, type: MarkerType, note: string) => {
    setMarkers(prev => ({ ...prev, [date]: { date, type, note } }));
  }, []);

  const deleteMarker = useCallback((date: string) => {
    setMarkers(prev => { const n = { ...prev }; delete n[date]; return n; });
  }, []);

  return { markers, setMarker, deleteMarker };
}
