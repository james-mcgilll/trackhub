import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import type { TodoItem, Priority } from '../../types/notes';
import { Badge } from '../ui/Badge';

interface TodoListComponentProps {
  todos: TodoItem[];
  filter: 'all' | 'active' | 'completed';
  setFilter: (f: 'all' | 'active' | 'completed') => void;
  priorityFilter: Priority | 'all';
  setPriorityFilter: (p: Priority | 'all') => void;
  onAdd: (text: string, priority: Priority) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onClearCompleted: () => void;
  stats: { total: number; active: number; completed: number; high: number };
}

const priorityConfig: Record<Priority, { label: string; badge: 'red' | 'yellow' | 'slate'; dot: string }> = {
  high: { label: 'High', badge: 'red', dot: 'bg-red-500' },
  medium: { label: 'Medium', badge: 'yellow', dot: 'bg-amber-400' },
  low: { label: 'Low', badge: 'slate', dot: 'bg-slate-400' },
};

export const TodoListComponent: React.FC<TodoListComponentProps> = ({
  todos,
  filter,
  setFilter,
  priorityFilter,
  setPriorityFilter,
  onAdd,
  onToggle,
  onDelete,
  onClearCompleted,
  stats,
}) => {
  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState<Priority>('medium');

  const handleAdd = () => {
    if (!newText.trim()) return;
    onAdd(newText.trim(), newPriority);
    setNewText('');
    setNewPriority('medium');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const formatDue = (date?: string) => {
    if (!date) return null;
    const d = new Date(date);
    const today = new Date();
    const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { text: 'Overdue', color: 'text-red-500' };
    if (diff === 0) return { text: 'Due today', color: 'text-orange-500' };
    if (diff === 1) return { text: 'Tomorrow', color: 'text-amber-500' };
    return { text: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(d), color: 'text-slate-400' };
  };

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                filter === f
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className={`ml-1.5 ${filter === f ? 'text-blue-600' : 'text-slate-400'}`}>
                {f === 'all' ? stats.total : f === 'active' ? stats.active : stats.completed}
              </span>
            </button>
          ))}
        </div>

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as Priority | 'all')}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-white outline-none focus:border-blue-300 cursor-pointer"
        >
          <option value="all">All priorities</option>
          <option value="high">High priority</option>
          <option value="medium">Medium priority</option>
          <option value="low">Low priority</option>
        </select>

        {stats.completed > 0 && (
          <button
            onClick={onClearCompleted}
            className="ml-auto text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            Clear completed ({stats.completed})
          </button>
        )}
      </div>

      {/* Add todo input */}
      <div className="flex gap-2 mb-4">
        <div className="flex flex-1 items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 focus-within:border-blue-300 transition-colors">
          <Plus size={15} className="text-slate-300 flex-shrink-0" />
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a new task..."
            className="flex-1 text-sm text-slate-700 placeholder-slate-400 outline-none bg-transparent"
          />
          {/* Priority selector inline */}
          <select
            value={newPriority}
            onChange={(e) => setNewPriority(e.target.value as Priority)}
            className="text-xs text-slate-500 outline-none bg-transparent cursor-pointer border-l border-slate-100 pl-2"
          >
            <option value="high">🔴 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">⚪ Low</option>
          </select>
        </div>
        <button
          onClick={handleAdd}
          disabled={!newText.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          Add
        </button>
      </div>

      {/* High priority alert */}
      {stats.high > 0 && filter !== 'completed' && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3.5 py-2.5 mb-3">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-600 font-medium">
            {stats.high} high-priority {stats.high === 1 ? 'task needs' : 'tasks need'} attention
          </p>
        </div>
      )}

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 size={36} className="text-slate-200 mb-3" />
            <p className="text-sm font-medium text-slate-400">No tasks here</p>
            <p className="text-xs text-slate-300 mt-1">
              {filter === 'completed' ? 'Complete some tasks first' : 'Add a task above to get started'}
            </p>
          </div>
        ) : (
          todos.map((todo) => {
            const pConfig = priorityConfig[todo.priority];
            const due = formatDue(todo.dueDate);
            return (
              <div
                key={todo.id}
                className={`
                  group flex items-start gap-3 p-3.5 rounded-xl border transition-all
                  ${todo.completed
                    ? 'bg-slate-50 border-slate-50'
                    : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm'
                  }
                `}
              >
                {/* Checkbox */}
                <button
                  onClick={() => onToggle(todo.id)}
                  className="mt-0.5 flex-shrink-0 transition-transform hover:scale-110"
                >
                  {todo.completed ? (
                    <CheckCircle2 size={18} className="text-emerald-500" />
                  ) : (
                    <Circle size={18} className={`${todo.priority === 'high' ? 'text-red-300' : 'text-slate-300'}`} />
                  )}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${todo.completed ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                    {todo.text}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {/* Priority badge */}
                    <div className={`flex items-center gap-1 text-xs font-medium ${
                      todo.completed ? 'opacity-40' : ''
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${pConfig.dot}`} />
                      <Badge variant={pConfig.badge}>{pConfig.label}</Badge>
                    </div>
                    {/* Due date */}
                    {due && !todo.completed && (
                      <div className={`flex items-center gap-1 text-xs ${due.color}`}>
                        <Calendar size={11} />
                        <span>{due.text}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => onDelete(todo.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400 transition-all flex-shrink-0"
                  title="Delete task"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
