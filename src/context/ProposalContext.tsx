import React, { createContext, useContext } from 'react';
import { useProposalTable } from '../hooks/useProposalTable';
import type { Column, Row, ColumnType } from '../types/proposals';

interface ProposalContextType {
  columns: Column[];
  rows: Row[];
  loading: boolean;
  error: string | null;
  addRow: () => void;
  duplicateRow: (rowId: string) => void;
  deleteRow: (rowId: string) => void;
  updateCell: (rowId: string, colId: string, value: string) => void;
  importRows: (rows: Omit<Row, 'id' | 'created_at'>[], mode?: 'skip' | 'overwrite') => Promise<void>;
  clearAllRows: () => Promise<void>;
  addColumn: (name: string, type: ColumnType, options?: { label: string; color: string }[]) => void;
  deleteColumn: (colId: string) => void;
  renameColumn: (colId: string, name: string) => void;
  changeColumnType: (colId: string, type: ColumnType) => void;
  resizeColumn: (colId: string, width: number) => void;
  reorderColumns: (sourceId: string, targetId: string, position: 'before' | 'after') => void;
  updateColumnOptions: (colId: string, options: any) => void;
}

const ProposalContext = createContext<ProposalContextType | null>(null);

// ── Single provider at the app root — data fetched ONCE, shared everywhere ──
export const ProposalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const data = useProposalTable();
  return (
    <ProposalContext.Provider value={data}>
      {children}
    </ProposalContext.Provider>
  );
};

// ── All modules use this hook to access proposal data ──
export function useProposals() {
  const ctx = useContext(ProposalContext);
  if (!ctx) throw new Error('useProposals must be used inside ProposalProvider');
  return ctx;
}
