import React, { useState, useMemo, useCallback } from 'react';
import { Plus, Search, X, MessageSquare, Users, Trash2, Edit2, AlertTriangle, LayoutGrid, List, CheckCircle2, Circle, Loader, PauseCircle, XCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { useTasks } from '../hooks/useTasks';
import type { Task, TaskStatus, TaskUrgency, TaskAssignee } from '../types/tasks';
import { URGENCY_CONFIG, STATUS_CONFIG, STATUS_ORDER } from '../types/tasks';

const fmt = (iso?: string) => iso ? new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtTime = (iso: string) => new Date(iso).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
const isOverdue = (t: Task) => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'completed' && t.status !== 'cancelled';
const isDueToday = (t: Task) => { if (!t.deadline) return false; const d = new Date(t.deadline); const n = new Date(); return d.toDateString() === n.toDateString(); };
const isDueThisWeek = (t: Task) => { if (!t.deadline) return false; const d = new Date(t.deadline); const n = new Date(); const end = new Date(n); end.setDate(n.getDate()+7); return d >= n && d <= end; };

const StatusIcon: React.FC<{status: TaskStatus; size?: number}> = ({ status, size=15 }) => {
  const icons: Record<TaskStatus,React.ReactNode> = {
    not_started: <Circle size={size} className="text-slate-400"/>,
    in_progress: <Loader size={size} className="text-blue-500"/>,
    waiting:     <PauseCircle size={size} className="text-amber-500"/>,
    completed:   <CheckCircle2 size={size} className="text-emerald-500"/>,
    delayed:     <AlertTriangle size={size} className="text-orange-500"/>,
    cancelled:   <XCircle size={size} className="text-slate-400"/>,
  };
  return <>{icons[status]}</>;
};

const UrgencyBadge: React.FC<{urgency: TaskUrgency}> = ({ urgency }) => {
  const c = URGENCY_CONFIG[urgency];
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.color} ${c.border} border`}>{c.label}</span>;
};

const StatusBadge: React.FC<{status: TaskStatus}> = ({ status }) => {
  const c = STATUS_CONFIG[status];
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.color} ${c.border} border flex items-center gap-1`}>
    <StatusIcon status={status} size={11}/>{c.label}
  </span>;
};

const ProgressBar: React.FC<{value: number; size?: 'sm'|'md'}> = ({ value, size='md' }) => (
  <div className={`bg-slate-100 rounded-full overflow-hidden ${size==='sm' ? 'h-1.5' : 'h-2.5'}`}>
    <div className={`h-full rounded-full transition-all ${value===100?'bg-emerald-500':value>60?'bg-blue-500':value>30?'bg-amber-400':'bg-slate-400'}`} style={{width:`${value}%`}}/>
  </div>
);

// ── Task Form ────────────────────────────────────────────────────────────────
const TaskForm: React.FC<{
  members: {id:string;name:string}[];
  initial?: Partial<Task>;
  onSave: (data: any) => void;
  onClose: () => void;
}> = ({ members, initial, onSave, onClose }) => {
  const [title,       setTitle]       = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [createdBy,   setCreatedBy]   = useState(initial?.created_by ?? '');
  const [urgency,     setUrgency]     = useState<TaskUrgency>(initial?.urgency ?? 'medium');
  const [status,      setStatus]      = useState<TaskStatus>(initial?.status ?? 'not_started');
  const [startDate,   setStartDate]   = useState(initial?.start_date ?? '');
  const [deadline,    setDeadline]    = useState(initial?.deadline ?? '');
  const [category,    setCategory]    = useState(initial?.category ?? '');
  const [notes,       setNotes]       = useState(initial?.notes ?? '');
  const [assignees,   setAssignees]   = useState<TaskAssignee[]>(initial?.assignees ?? []);
  const [selMember,   setSelMember]   = useState('');

  const addAssignee = () => {
    if (!selMember || assignees.find(a => a.member_id === selMember)) return;
    setAssignees(p => [...p, { member_id: selMember, assigned_date: new Date().toISOString().slice(0,10), status: 'not_started', progress: 0 }]);
    setSelMember('');
  };

  const removeAssignee = (id: string) => setAssignees(p => p.filter(a => a.member_id !== id));

  const updateAssigneeField = (memberId: string, field: string, value: any) =>
    setAssignees(p => p.map(a => a.member_id === memberId ? {...a, [field]: value} : a));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title, description, created_by: createdBy, urgency, status, start_date: startDate, deadline, category, notes, assignees });
  };

  const memberName = (id: string) => members.find(m => m.id === id)?.name ?? id;
  const availableMembers = members.filter(m => !assignees.find(a => a.member_id === m.id));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8" style={{boxShadow:'0 24px 64px rgba(0,0,0,0.2)'}}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800" style={{fontFamily:"'Space Grotesk',sans-serif"}}>{initial?.id ? 'Edit Task' : 'New Task'}</h2>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} className="text-slate-500"/></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Task Title *</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} required placeholder="Enter task title..."
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"/>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Description</label>
            <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} placeholder="Describe the task..."
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 resize-none"/>
          </div>

          {/* Row: Created by + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Created By</label>
              <input value={createdBy} onChange={e=>setCreatedBy(e.target.value)} placeholder="Your name"
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Category / Project</label>
              <input value={category} onChange={e=>setCategory(e.target.value)} placeholder="e.g. Marketing"
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"/>
            </div>
          </div>

          {/* Row: Urgency + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Urgency</label>
              <select value={urgency} onChange={e=>setUrgency(e.target.value as TaskUrgency)}
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 bg-white">
                {Object.entries(URGENCY_CONFIG).map(([v,c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
              <select value={status} onChange={e=>setStatus(e.target.value as TaskStatus)}
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 bg-white">
                {Object.entries(STATUS_CONFIG).map(([v,c]) => <option key={v} value={v}>{c.label}</option>)}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Start Date</label>
              <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"/>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Deadline</label>
              <input type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400"/>
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Assignees</label>
            <div className="flex gap-2 mb-3">
              <select value={selMember} onChange={e=>setSelMember(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white">
                <option value="">Select team member...</option>
                {availableMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <button type="button" onClick={addAssignee} disabled={!selMember}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-40 font-medium">
                <Plus size={14}/>
              </button>
            </div>
            {assignees.length > 0 && (
              <div className="space-y-2">
                {assignees.map(a => (
                  <div key={a.member_id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700">{memberName(a.member_id)}</span>
                      <button type="button" onClick={()=>removeAssignee(a.member_id)} className="text-slate-400 hover:text-red-500"><X size={14}/></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Deadline</p>
                        <input type="date" value={a.deadline??''} onChange={e=>updateAssigneeField(a.member_id,'deadline',e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-400"/>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Status</p>
                        <select value={a.status} onChange={e=>updateAssigneeField(a.member_id,'status',e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-400 bg-white">
                          {Object.entries(STATUS_CONFIG).map(([v,c]) => <option key={v} value={v}>{c.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Progress %</p>
                        <input type="number" min={0} max={100} value={a.progress} onChange={e=>updateAssigneeField(a.member_id,'progress',Math.min(100,Math.max(0,+e.target.value)))}
                          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-blue-400"/>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="Additional notes..."
              className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-blue-400 resize-none"/>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 font-medium">Cancel</button>
          <button type="submit" className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-xl font-medium shadow-sm shadow-blue-200">
            {initial?.id ? 'Save Changes' : 'Create Task'}
          </button>
        </div>
      </form>
    </div>
  );
};

// ── Task Detail Modal ────────────────────────────────────────────────────────
const TaskDetail: React.FC<{
  task: Task;
  members: {id:string;name:string}[];
  onClose: () => void;
  onUpdate?: (id:string, changes:Partial<Task>, note?:string, author?:string) => void;
  onComment: (taskId:string, text:string, authorId:string, authorName:string, status?:TaskStatus) => void;
  onUpdateAssignee: (taskId:string, memberId:string, changes:any, author:string) => void;
  onEdit: () => void;
}> = ({ task, members, onClose, onComment, onUpdateAssignee, onEdit }) => {
  const [tab,         setTab]         = useState<'details'|'assignees'|'comments'|'history'>('details');
  const [commentText, setCommentText] = useState('');
  const [commentBy,   setCommentBy]   = useState('');
  const [commentStatus, setCommentStatus] = useState<TaskStatus|''>('');

  const memberName = (id: string) => members.find(m => m.id === id)?.name ?? id;

  const submitComment = () => {
    if (!commentText.trim() || !commentBy.trim()) return;
    onComment(task.id, commentText.trim(), 'user', commentBy.trim(), commentStatus||undefined);
    setCommentText(''); setCommentStatus('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-8" style={{boxShadow:'0 24px 64px rgba(0,0,0,0.2)'}}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-mono font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded">{task.task_id}</span>
                <StatusBadge status={task.status}/>
                <UrgencyBadge urgency={task.urgency}/>
                {isOverdue(task) && <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Overdue</span>}
              </div>
              <h2 className="text-base font-bold text-slate-800" style={{fontFamily:"'Space Grotesk',sans-serif"}}>{task.title}</h2>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={onEdit} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><Edit2 size={14}/></button>
              <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"><X size={16}/></button>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Overall Progress</span><span className="font-bold text-slate-700">{task.progress}%</span></div>
            <ProgressBar value={task.progress}/>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3 border-b border-slate-100">
            {(['details','assignees','comments','history'] as const).map(t => (
              <button key={t} onClick={()=>setTab(t)}
                className={`px-3 py-2 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${tab===t?'border-blue-500 text-blue-600':'border-transparent text-slate-500 hover:text-slate-700'}`}>
                {t} {t==='comments'&&task.comments.length>0?`(${task.comments.length})`:''}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto" style={{maxHeight:'60vh'}}>
          {/* Details tab */}
          {tab === 'details' && (
            <div className="space-y-4">
              {task.description && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Description</p><p className="text-sm text-slate-700 leading-relaxed">{task.description}</p></div>}
              <div className="grid grid-cols-2 gap-4">
                {[
                  ['Created By', task.created_by || '—'],
                  ['Category', task.category || '—'],
                  ['Start Date', fmt(task.start_date)],
                  ['Deadline', fmt(task.deadline)],
                  ['Completed', fmt(task.completion_date)],
                  ['Assignees', task.assignees.length > 0 ? task.assignees.map(a=>memberName(a.member_id)).join(', ') : '—'],
                ].map(([label,val]) => (
                  <div key={label}><p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{label}</p><p className="text-sm text-slate-700 mt-0.5">{val}</p></div>
                ))}
              </div>
              {task.notes && <div><p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Notes</p><p className="text-sm text-slate-700 leading-relaxed">{task.notes}</p></div>}
            </div>
          )}

          {/* Assignees tab */}
          {tab === 'assignees' && (
            <div className="space-y-3">
              {task.assignees.length === 0 ? <p className="text-sm text-slate-400 text-center py-8">No assignees yet</p> : task.assignees.map(a => {
                return (
                  <div key={a.member_id} className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-semibold text-slate-800 text-sm">{memberName(a.member_id)}</span>
                      <StatusBadge status={a.status}/>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
                      <div><p className="text-slate-400 mb-0.5">Assigned</p><p className="font-medium">{fmt(a.assigned_date)}</p></div>
                      <div><p className="text-slate-400 mb-0.5">Deadline</p><p className="font-medium">{fmt(a.deadline)}</p></div>
                      <div><p className="text-slate-400 mb-0.5">Completed</p><p className="font-medium">{fmt(a.completion_date)}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <ProgressBar value={a.progress} size="sm"/>
                      <span className="text-xs font-bold text-slate-600 flex-shrink-0">{a.progress}%</span>
                    </div>
                    {/* Quick update */}
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <select value={a.status} onChange={e=>onUpdateAssignee(task.id,a.member_id,{status:e.target.value},memberName(a.member_id))}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none bg-white focus:border-blue-400">
                        {Object.entries(STATUS_CONFIG).map(([v,c])=><option key={v} value={v}>{c.label}</option>)}
                      </select>
                      <div className="flex items-center gap-1 col-span-2">
                        <input type="range" min={0} max={100} value={a.progress}
                          onChange={e=>onUpdateAssignee(task.id,a.member_id,{progress:+e.target.value},memberName(a.member_id))}
                          className="flex-1 accent-blue-500"/>
                        <span className="text-xs text-slate-500 w-8 text-right">{a.progress}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Comments tab */}
          {tab === 'comments' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {task.comments.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No comments yet</p>}
                {task.comments.map(c => (
                  <div key={c.id} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-700">{c.author_name}</span>
                      {c.status_update && <StatusBadge status={c.status_update}/>}
                      <span className="text-xs text-slate-400 ml-auto">{fmtTime(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
              {/* Add comment */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add Comment</p>
                <input value={commentBy} onChange={e=>setCommentBy(e.target.value)} placeholder="Your name"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"/>
                <textarea value={commentText} onChange={e=>setCommentText(e.target.value)} rows={3} placeholder="Write your comment..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 resize-none"/>
                <div className="flex gap-2">
                  <select value={commentStatus} onChange={e=>setCommentStatus(e.target.value as TaskStatus|'')}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400 bg-white">
                    <option value="">No status update</option>
                    {Object.entries(STATUS_CONFIG).map(([v,c])=><option key={v} value={v}>→ {c.label}</option>)}
                  </select>
                  <button onClick={submitComment} disabled={!commentText.trim()||!commentBy.trim()}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-40 font-medium">
                    Post
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* History tab */}
          {tab === 'history' && (
            <div className="space-y-2">
              {[...task.history].reverse().map(h => (
                <div key={h.id} className="flex gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{h.detail}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{fmtTime(h.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Page ────────────────────────────────────────────────────────────────
export const TaskTrackerPage: React.FC = () => {
  const { tasks, members, loading, createTask, updateTask, deleteTask, addComment, updateAssignee, addMember, deleteMember } = useTasks();

  const [view,         setView]         = useState<'table'|'kanban'>('table');
  const [showForm,     setShowForm]     = useState(false);
  const [editTask,     setEditTask]     = useState<Task|null>(null);
  const [detailTask,   setDetailTask]   = useState<Task|null>(null);
  const [showMembers,  setShowMembers]  = useState(false);
  const [newMember,    setNewMember]    = useState('');
  const [searchQ,      setSearchQ]      = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus|'all'>('all');
  const [filterUrgency,setFilterUrgency]= useState<TaskUrgency|'all'>('all');
  const [filterMember, setFilterMember] = useState('all');
  const [filterDue,    setFilterDue]    = useState<'all'|'today'|'week'|'overdue'>('all');

  // Keep detail task in sync with live data
  const syncedDetailTask = useMemo(() =>
    detailTask ? (tasks.find(t => t.id === detailTask.id) ?? detailTask) : null,
    [detailTask, tasks]
  );

  const memberName = useCallback((id: string) => members.find(m => m.id === id)?.name ?? id, [members]);

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterUrgency !== 'all' && t.urgency !== filterUrgency) return false;
      if (filterMember !== 'all' && !t.assignees.find(a => a.member_id === filterMember)) return false;
      if (filterDue === 'today' && !isDueToday(t)) return false;
      if (filterDue === 'week' && !isDueThisWeek(t)) return false;
      if (filterDue === 'overdue' && !isOverdue(t)) return false;
      if (searchQ && !t.title.toLowerCase().includes(searchQ.toLowerCase()) && !t.task_id.toLowerCase().includes(searchQ.toLowerCase()) && !(t.category??'').toLowerCase().includes(searchQ.toLowerCase())) return false;
      return true;
    });
  }, [tasks, filterStatus, filterUrgency, filterMember, filterDue, searchQ]);

  // Stats
  const stats = useMemo(() => ({
    total:     tasks.length,
    open:      tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    delayed:   tasks.filter(t => t.status === 'delayed').length,
    critical:  tasks.filter(t => t.urgency === 'critical' && t.status !== 'completed').length,
    today:     tasks.filter(isDueToday).length,
    week:      tasks.filter(isDueThisWeek).length,
    overdue:   tasks.filter(isOverdue).length,
  }), [tasks]);

  const handleCreate = useCallback(async (data: any) => {
    await createTask(data);
    setShowForm(false);
  }, [createTask]);

  const handleEdit = useCallback(async (data: any) => {
    if (!editTask) return;
    await updateTask(editTask.id, data, 'Task updated', data.created_by || 'User');
    setEditTask(null);
    setDetailTask(null);
  }, [editTask, updateTask]);

  const handleAddMember = async () => {
    if (!newMember.trim()) return;
    await addMember(newMember.trim());
    setNewMember('');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
      <span className="text-sm text-slate-500">Loading tasks...</span>
    </div>
  );

  return (
    <div className="space-y-5 w-full pb-10">
      <PageHeader title="Task Tracker" subtitle={`${stats.total} tasks · ${stats.open} open`}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={()=>setShowMembers(s=>!s)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors" style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
              <Users size={14}/> Team
            </button>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              <button onClick={()=>setView('table')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${view==='table'?'bg-white text-slate-800 shadow-sm':'text-slate-500'}`}><List size={13} className="inline mr-1"/>Table</button>
              <button onClick={()=>setView('kanban')} className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${view==='kanban'?'bg-white text-slate-800 shadow-sm':'text-slate-500'}`}><LayoutGrid size={13} className="inline mr-1"/>Kanban</button>
            </div>
            <button onClick={()=>setShowForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200">
              <Plus size={14}/> New Task
            </button>
          </div>
        }
      />

      {/* Team Members Panel */}
      {showMembers && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5" style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800" style={{fontFamily:"'Space Grotesk',sans-serif"}}>Team Members</h3>
            <button onClick={()=>setShowMembers(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
          </div>
          <div className="flex gap-2 mb-4">
            <input value={newMember} onChange={e=>setNewMember(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAddMember()} placeholder="Add team member name..."
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-blue-400"/>
            <button onClick={handleAddMember} disabled={!newMember.trim()} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 disabled:opacity-40 font-medium">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 text-xs font-bold rounded-full flex items-center justify-center">{m.name[0]}</span>
                <span className="text-sm text-slate-700 font-medium">{m.name}</span>
                <button onClick={()=>deleteMember(m.id)} className="text-slate-300 hover:text-red-500 ml-1"><X size={12}/></button>
              </div>
            ))}
            {members.length === 0 && <p className="text-sm text-slate-400">No team members yet. Add names above to assign tasks.</p>}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
        {[
          {label:'Total',    val:stats.total,    color:'text-slate-700', bg:'bg-slate-50 border-slate-100',   filter:null},
          {label:'Open',     val:stats.open,     color:'text-blue-700',  bg:'bg-blue-50 border-blue-100',     filter:()=>setFilterStatus('in_progress')},
          {label:'Completed',val:stats.completed,color:'text-emerald-700',bg:'bg-emerald-50 border-emerald-100',filter:()=>setFilterStatus('completed')},
          {label:'Delayed',  val:stats.delayed,  color:'text-orange-700',bg:'bg-orange-50 border-orange-100', filter:()=>setFilterStatus('delayed')},
          {label:'Critical', val:stats.critical, color:'text-red-700',   bg:'bg-red-50 border-red-100',       filter:()=>setFilterUrgency('critical')},
          {label:'Due Today',val:stats.today,    color:'text-violet-700',bg:'bg-violet-50 border-violet-100', filter:()=>setFilterDue('today')},
          {label:'This Week',val:stats.week,     color:'text-cyan-700',  bg:'bg-cyan-50 border-cyan-100',     filter:()=>setFilterDue('week')},
          {label:'Overdue',  val:stats.overdue,  color:'text-red-700',   bg:'bg-red-50 border-red-100',       filter:()=>setFilterDue('overdue')},
        ].map(({label,val,color,bg,filter})=>(
          <button key={label} onClick={()=>filter&&filter()} className={`${bg} border rounded-xl p-3 text-left transition-all hover:shadow-sm ${filter?'cursor-pointer':'cursor-default'}`}>
            <p className={`text-xl font-bold ${color}`} style={{fontFamily:"'Space Grotesk',sans-serif"}}>{val}</p>
            <p className={`text-xs font-medium ${color} opacity-70 mt-0.5`}>{label}</p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 min-w-48" style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          <Search size={14} className="text-slate-400 flex-shrink-0"/>
          <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} placeholder="Search tasks..." className="text-sm bg-transparent outline-none flex-1 text-slate-700"/>
          {searchQ && <button onClick={()=>setSearchQ('')}><X size={13} className="text-slate-400"/></button>}
        </div>
        {[
          {label:'Status', val:filterStatus, set:(v:string)=>setFilterStatus(v as any), opts:[['all','All Status'],...Object.entries(STATUS_CONFIG).map(([v,c])=>[v,c.label])]},
          {label:'Urgency', val:filterUrgency, set:(v:string)=>setFilterUrgency(v as any), opts:[['all','All Urgency'],...Object.entries(URGENCY_CONFIG).map(([v,c])=>[v,c.label])]},
          {label:'Assignee', val:filterMember, set:(v:string)=>setFilterMember(v), opts:[['all','All Members'],...members.map(m=>[m.id,m.name])]},
          {label:'Due', val:filterDue, set:(v:string)=>setFilterDue(v as any), opts:[['all','Any Date'],['today','Due Today'],['week','This Week'],['overdue','Overdue']]},
        ].map(({label,val,set,opts})=>(
          <select key={label} value={val} onChange={e=>set(e.target.value)}
            className={`border rounded-xl px-3 py-2 text-sm outline-none cursor-pointer bg-white ${val!=='all'?'border-blue-300 text-blue-600':'border-slate-200 text-slate-600'}`}
            style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
            {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        {(filterStatus!=='all'||filterUrgency!=='all'||filterMember!=='all'||filterDue!=='all'||searchQ) && (
          <button onClick={()=>{setFilterStatus('all');setFilterUrgency('all');setFilterMember('all');setFilterDue('all');setSearchQ('');}}
            className="text-xs text-slate-500 hover:text-red-500 px-2 transition-colors">Clear all</button>
        )}
        <span className="ml-auto text-xs text-slate-400">{filtered.length} tasks</span>
      </div>

      {/* ── Table View ── */}
      {view === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden" style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <CheckCircle2 size={36} className="text-slate-200"/>
              <p className="text-sm font-semibold text-slate-400">No tasks found</p>
              <button onClick={()=>setShowForm(true)} className="text-sm text-blue-600 hover:underline">Create your first task</button>
            </div>
          ) : (
            <table className="w-full" style={{tableLayout:'fixed'}}>
              <colgroup>
                <col style={{width:80}}/><col style={{width:'30%'}}/><col style={{width:100}}/><col style={{width:110}}/><col style={{width:100}}/><col style={{width:80}}/><col style={{width:110}}/><col style={{width:80}}/>
              </colgroup>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['ID','Title','Urgency','Status','Progress','Assignees','Deadline',''].map(h=>(
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t=>(
                  <tr key={t.id} onClick={()=>setDetailTask(t)}
                    className={`border-b border-slate-50 last:border-0 cursor-pointer hover:bg-blue-50/30 transition-colors ${isOverdue(t)?'bg-red-50/30':''}`}>
                    <td className="px-3 py-3"><span className="text-xs font-mono font-bold text-blue-500">{t.task_id}</span></td>
                    <td className="px-3 py-3">
                      <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
                      {t.category && <p className="text-xs text-slate-400 truncate">{t.category}</p>}
                    </td>
                    <td className="px-3 py-3"><UrgencyBadge urgency={t.urgency}/></td>
                    <td className="px-3 py-3"><StatusBadge status={t.status}/></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={t.progress} size="sm"/>
                        <span className="text-xs text-slate-500 flex-shrink-0">{t.progress}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex -space-x-1">
                        {t.assignees.slice(0,3).map(a=>(
                          <span key={a.member_id} title={memberName(a.member_id)} className="w-6 h-6 bg-blue-100 text-blue-600 text-xs font-bold rounded-full flex items-center justify-center border border-white ring-1 ring-blue-200">
                            {memberName(a.member_id)[0]}
                          </span>
                        ))}
                        {t.assignees.length > 3 && <span className="w-6 h-6 bg-slate-100 text-slate-500 text-xs font-bold rounded-full flex items-center justify-center border border-white">+{t.assignees.length-3}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs ${isOverdue(t)?'text-red-600 font-semibold':isDueToday(t)?'text-amber-600 font-semibold':'text-slate-500'}`}>
                        {fmt(t.deadline)}
                      </span>
                    </td>
                    <td className="px-3 py-3" onClick={e=>e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={()=>{setEditTask(t);}} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-500"><Edit2 size={13}/></button>
                        <button onClick={()=>deleteTask(t.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Kanban View ── */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUS_ORDER.map(status => {
            const colTasks = filtered.filter(t => t.status === status);
            const sc = STATUS_CONFIG[status];
            return (
              <div key={status} className="flex-shrink-0 w-72">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-3 ${sc.bg} ${sc.border} border`}>
                  <StatusIcon status={status}/>
                  <span className={`text-xs font-bold ${sc.color}`}>{sc.label}</span>
                  <span className={`ml-auto text-xs font-bold ${sc.color} opacity-60`}>{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map(t=>(
                    <div key={t.id} onClick={()=>setDetailTask(t)}
                      className={`bg-white rounded-xl border p-3 cursor-pointer hover:shadow-md transition-all ${isOverdue(t)?'border-red-200':'border-slate-100'}`}
                      style={{boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-xs font-mono text-blue-500">{t.task_id}</span>
                        <UrgencyBadge urgency={t.urgency}/>
                      </div>
                      <p className="text-sm font-medium text-slate-800 leading-snug mb-2">{t.title}</p>
                      <ProgressBar value={t.progress} size="sm"/>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex -space-x-1">
                          {t.assignees.slice(0,3).map(a=>(
                            <span key={a.member_id} title={memberName(a.member_id)} className="w-5 h-5 bg-blue-100 text-blue-600 text-xs font-bold rounded-full flex items-center justify-center border border-white">
                              {memberName(a.member_id)[0]}
                            </span>
                          ))}
                        </div>
                        {t.deadline && <span className={`text-xs ${isOverdue(t)?'text-red-500 font-semibold':isDueToday(t)?'text-amber-600':'text-slate-400'}`}>{fmt(t.deadline)}</span>}
                      </div>
                      {t.comments.length > 0 && <div className="flex items-center gap-1 mt-2 text-slate-400"><MessageSquare size={11}/><span className="text-xs">{t.comments.length}</span></div>}
                    </div>
                  ))}
                  {colTasks.length === 0 && <div className="text-center py-6 text-xs text-slate-300">No tasks</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {showForm && <TaskForm members={members} onSave={handleCreate} onClose={()=>setShowForm(false)}/>}
      {editTask  && <TaskForm members={members} initial={editTask} onSave={handleEdit} onClose={()=>setEditTask(null)}/>}
      {syncedDetailTask && (
        <TaskDetail task={syncedDetailTask} members={members}
          onClose={()=>setDetailTask(null)}
          onUpdate={updateTask}
          onComment={addComment}
          onUpdateAssignee={updateAssignee}
          onEdit={()=>{setEditTask(syncedDetailTask);}}
        />
      )}
    </div>
  );
};
