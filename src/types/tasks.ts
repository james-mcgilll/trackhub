export type TaskUrgency = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus  = 'not_started' | 'in_progress' | 'waiting' | 'completed' | 'delayed' | 'cancelled';

export interface TeamMember {
  id: string;
  name: string;
  email?: string;
  created_at: string;
}

export interface TaskAssignee {
  member_id: string;
  assigned_date: string;
  deadline?: string;
  status: TaskStatus;
  progress: number; // 0-100
  completion_date?: string;
  notes?: string;
}

export interface TaskComment {
  id: string;
  text: string;
  author_id: string;
  author_name: string;
  created_at: string;
  status_update?: TaskStatus;
}

export interface TaskHistoryEntry {
  id: string;
  action: string;
  detail: string;
  author_name: string;
  created_at: string;
}

export interface Task {
  id: string;
  task_id: string; // TK-001
  title: string;
  description: string;
  created_by: string;
  assignees: TaskAssignee[];
  urgency: TaskUrgency;
  status: TaskStatus;
  start_date?: string;
  deadline?: string;
  completion_date?: string;
  category?: string;
  notes?: string;
  comments: TaskComment[];
  history: TaskHistoryEntry[];
  progress: number;
  created_at: string;
  updated_at: string;
}

export const URGENCY_CONFIG: Record<TaskUrgency, { label: string; color: string; bg: string; border: string }> = {
  low:      { label: 'Low',      color: 'text-slate-600',   bg: 'bg-slate-100',   border: 'border-slate-200'   },
  medium:   { label: 'Medium',   color: 'text-amber-700',   bg: 'bg-amber-100',   border: 'border-amber-200'   },
  high:     { label: 'High',     color: 'text-orange-700',  bg: 'bg-orange-100',  border: 'border-orange-200'  },
  critical: { label: 'Critical', color: 'text-red-700',     bg: 'bg-red-100',     border: 'border-red-200'     },
};

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; border: string }> = {
  not_started: { label: 'Not Started', color: 'text-slate-600',   bg: 'bg-slate-100',   border: 'border-slate-200'   },
  in_progress: { label: 'In Progress', color: 'text-blue-700',    bg: 'bg-blue-100',    border: 'border-blue-200'    },
  waiting:     { label: 'Waiting',     color: 'text-amber-700',   bg: 'bg-amber-100',   border: 'border-amber-200'   },
  completed:   { label: 'Completed',   color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  delayed:     { label: 'Delayed',     color: 'text-orange-700',  bg: 'bg-orange-100',  border: 'border-orange-200'  },
  cancelled:   { label: 'Cancelled',   color: 'text-slate-500',   bg: 'bg-slate-100',   border: 'border-slate-200'   },
};

export const STATUS_ORDER: TaskStatus[] = ['not_started','in_progress','waiting','completed','delayed','cancelled'];
