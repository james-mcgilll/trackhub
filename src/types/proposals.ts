// ─── Column Types ────────────────────────────────────────────────────────────

export type ColumnType = 'text' | 'number' | 'date' | 'link' | 'dropdown';

export interface DropdownOption {
  id: string;
  label: string;
  color: string; // tailwind bg color class
}

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  width: number;       // pixels
  order: number;       // sort order
  options?: DropdownOption[]; // only for dropdown type
}

// ─── Row / Cell ──────────────────────────────────────────────────────────────

/** Cell values keyed by column id */
export type RowData = Record<string, string>;

export interface Row {
  id: string;
  data: RowData;
  createdAt: number;
}

// ─── Table State ─────────────────────────────────────────────────────────────

export interface TableState {
  columns: Column[];
  rows: Row[];
}

// ─── Storage keys (ready to swap for API calls later) ────────────────────────

export const STORAGE_KEY = 'trackhub_proposals_v1';

// ─── Default dropdown option colors ──────────────────────────────────────────

export const OPTION_COLORS = [
  { label: 'Blue',   value: 'blue'   },
  { label: 'Green',  value: 'green'  },
  { label: 'Yellow', value: 'yellow' },
  { label: 'Red',    value: 'red'    },
  { label: 'Purple', value: 'purple' },
  { label: 'Orange', value: 'orange' },
  { label: 'Slate',  value: 'slate'  },
];

export const OPTION_COLOR_STYLES: Record<string, string> = {
  blue:   'bg-blue-100 text-blue-700',
  green:  'bg-emerald-100 text-emerald-700',
  yellow: 'bg-amber-100 text-amber-700',
  red:    'bg-red-100 text-red-600',
  purple: 'bg-violet-100 text-violet-700',
  orange: 'bg-orange-100 text-orange-700',
  slate:  'bg-slate-100 text-slate-600',
};
