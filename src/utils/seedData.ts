import { supabase } from './supabase';

const DEFAULT_COLUMNS = [
  { id: 'col_client',  name: 'Client Name',    type: 'text',     width: 180, order: 0, options: null },
  { id: 'col_title',   name: 'Proposal Title', type: 'text',     width: 220, order: 1, options: null },
  { id: 'col_value',   name: 'Value ($)',       type: 'number',   width: 130, order: 2, options: null },
  { id: 'col_date',    name: 'Sent Date',       type: 'date',     width: 140, order: 3, options: null },
  {
    id: 'col_status', name: 'Status', type: 'dropdown', width: 150, order: 4,
    options: [
      { id: 'opt_draft',    label: 'Draft',     color: 'slate'  },
      { id: 'opt_sent',     label: 'Sent',      color: 'blue'   },
      { id: 'opt_review',   label: 'In Review', color: 'yellow' },
      { id: 'opt_accepted', label: 'Accepted',  color: 'green'  },
      { id: 'opt_rejected', label: 'Rejected',  color: 'red'    },
    ],
  },
  { id: 'col_notes', name: 'Notes', type: 'text', width: 200, order: 5, options: null },
];

const DEFAULT_ROWS = [
  { id: 'row_1', display_id: 'UP001', data: { col_client: 'Acme Corp',        col_title: 'Website Redesign Phase 2', col_value: '45000',  col_date: '2024-12-05', col_status: 'opt_sent',     col_notes: 'Follow up Friday' } },
  { id: 'row_2', display_id: 'UP002', data: { col_client: 'GlobalTech',       col_title: 'ERP Integration',          col_value: '120000', col_date: '2024-12-08', col_status: 'opt_review',   col_notes: 'Awaiting VP sign-off' } },
  { id: 'row_3', display_id: 'UP003', data: { col_client: 'NovaTech',         col_title: 'Mobile App Development',   col_value: '78000',  col_date: '2024-11-28', col_status: 'opt_accepted', col_notes: 'Contract sent' } },
  { id: 'row_4', display_id: 'UP004', data: { col_client: 'DataStream',       col_title: 'Analytics Dashboard',      col_value: '32000',  col_date: '2024-12-10', col_status: 'opt_draft',    col_notes: '' } },
  { id: 'row_5', display_id: 'UP005', data: { col_client: 'Bright Solutions', col_title: 'Cloud Migration',          col_value: '95000',  col_date: '2024-12-01', col_status: 'opt_rejected', col_notes: 'Lost to competitor' } },
];

export async function seedIfEmpty() {
  try {
    const { count } = await supabase
      .from('proposal_columns')
      .select('*', { count: 'exact', head: true });
    if (count === 0) {
      await supabase.from('proposal_columns').insert(DEFAULT_COLUMNS);
      await supabase.from('proposal_rows').insert(DEFAULT_ROWS);
    }
  } catch { /* ignore */ }
}
