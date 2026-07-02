import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../utils/supabase';
import type { Task, TeamMember, TaskStatus, TaskUrgency, TaskAssignee, TaskComment, TaskHistoryEntry } from '../types/tasks';

const uid = (p='t') => `${p}_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
const bg = (p: PromiseLike<unknown>) => Promise.resolve(p).catch(() => {});
const now = () => new Date().toISOString();

function rowToTask(r: any): Task {
  return {
    id: r.id, task_id: r.task_id, title: r.title, description: r.description ?? '',
    created_by: r.created_by ?? '', assignees: r.assignees ?? [], urgency: r.urgency,
    status: r.status, start_date: r.start_date, deadline: r.deadline,
    completion_date: r.completion_date, category: r.category, notes: r.notes ?? '',
    comments: r.comments ?? [], history: r.history ?? [], progress: r.progress ?? 0,
    created_at: r.created_at, updated_at: r.updated_at,
  };
}

export function useTasks() {
  const [tasks,   setTasks]   = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const localIns = useRef<Set<string>>(new Set());
  const localDel = useRef<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      try {
        const [{ data: td }, { data: md }] = await Promise.all([
          supabase.from('tasks').select('*').order('created_at', { ascending: false }),
          supabase.from('team_members').select('*').order('name'),
        ]);
        if (td) setTasks(td.map(rowToTask));
        if (md) setMembers(md as TeamMember[]);
      } catch { } finally { setLoading(false); }
    })();

    // Realtime for tasks
    const ch = supabase.channel(`tasks_rt_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, ({ eventType, new: n, old: o }) => {
        if (eventType === 'INSERT') { const r = rowToTask(n); if (localIns.current.has(r.id)) { localIns.current.delete(r.id); return; } setTasks(p => p.find(x => x.id === r.id) ? p : [r, ...p]); }
        if (eventType === 'UPDATE') setTasks(p => p.map(x => x.id === (n as any).id ? rowToTask(n) : x));
        if (eventType === 'DELETE') { const id = (o as any).id; if (localDel.current.has(id)) { localDel.current.delete(id); return; } setTasks(p => p.filter(x => x.id !== id)); }
      }).subscribe();
    const mch = supabase.channel(`members_rt_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, ({ eventType, new: n, old: o }) => {
        if (eventType === 'INSERT') setMembers(p => p.find((x:TeamMember) => x.id === (n as any).id) ? p : [...p, n as TeamMember].sort((a,b) => a.name.localeCompare(b.name)));
        if (eventType === 'DELETE') setMembers(p => p.filter((x:TeamMember) => x.id !== (o as any).id));
      }).subscribe();
    return () => { supabase.removeChannel(ch); supabase.removeChannel(mch); };
  }, []);

  // Next task ID
  const nextTaskId = useCallback(() => {
    const max = tasks.reduce((m, t) => { const n = parseInt(t.task_id.replace('TK-',''),10); return n > m ? n : m; }, 0);
    return `TK-${String(max+1).padStart(3,'0')}`;
  }, [tasks]);

  const addHistoryEntry = (action: string, detail: string, author: string): TaskHistoryEntry => ({
    id: uid('h'), action, detail, author_name: author, created_at: now(),
  });

  const createTask = useCallback(async (data: {
    title: string; description: string; created_by: string;
    urgency: TaskUrgency; status: TaskStatus; start_date?: string;
    deadline?: string; category?: string; notes?: string;
    assignees: TaskAssignee[];
  }) => {
    const task: Task = {
      id: uid('task'), task_id: nextTaskId(), ...data,
      comments: [], progress: 0,
      history: [addHistoryEntry('created', `Task created by ${data.created_by}`, data.created_by)],
      created_at: now(), updated_at: now(),
    };
    localIns.current.add(task.id);
    setTasks(p => [task, ...p]);
    await supabase.from('tasks').insert(task);
    return task;
  }, [nextTaskId]);

  const updateTask = useCallback(async (id: string, changes: Partial<Task>, historyNote?: string, author?: string) => {
    setTasks(p => p.map(t => {
      if (t.id !== id) return t;
      const hist = historyNote ? [...t.history, addHistoryEntry('updated', historyNote, author ?? 'System')] : t.history;
      const updated = { ...t, ...changes, history: hist, updated_at: now() };
      bg(supabase.from('tasks').update({ ...changes, history: hist, updated_at: updated.updated_at }).eq('id', id));
      return updated;
    }));
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    localDel.current.add(id);
    setTasks(p => p.filter(t => t.id !== id));
    bg(supabase.from('tasks').delete().eq('id', id));
  }, []);

  const addComment = useCallback(async (taskId: string, text: string, authorId: string, authorName: string, statusUpdate?: TaskStatus) => {
    const comment: TaskComment = { id: uid('c'), text, author_id: authorId, author_name: authorName, created_at: now(), status_update: statusUpdate };
    setTasks(p => p.map(t => {
      if (t.id !== taskId) return t;
      const comments = [...t.comments, comment];
      const status = statusUpdate ?? t.status;
      const hist = [...t.history, addHistoryEntry('comment', `${authorName} commented: "${text.slice(0,60)}${text.length>60?'...':''}"`, authorName)];
      const updated = { ...t, comments, status, history: hist, updated_at: now() };
      bg(supabase.from('tasks').update({ comments, status, history: hist, updated_at: updated.updated_at }).eq('id', taskId));
      return updated;
    }));
  }, []);

  const updateAssignee = useCallback(async (taskId: string, memberId: string, changes: Partial<TaskAssignee>, author: string) => {
    setTasks(p => p.map(t => {
      if (t.id !== taskId) return t;
      const assignees = t.assignees.map(a => a.member_id === memberId ? { ...a, ...changes } : a);
      const avgProgress = assignees.length > 0 ? Math.round(assignees.reduce((s,a) => s+a.progress,0)/assignees.length) : 0;
      const allDone = assignees.every(a => a.status === 'completed');
      const status = allDone ? 'completed' : t.status;
      const hist = [...t.history, addHistoryEntry('assignee_updated', `${author} updated progress`, author)];
      const updated = { ...t, assignees, progress: avgProgress, status, history: hist, updated_at: now() };
      bg(supabase.from('tasks').update({ assignees, progress: avgProgress, status, history: hist, updated_at: updated.updated_at }).eq('id', taskId));
      return updated;
    }));
  }, []);

  const addMember = useCallback(async (name: string, email?: string) => {
    const member: TeamMember = { id: uid('m'), name, email, created_at: now() };
    setMembers(p => [...p, member].sort((a,b) => a.name.localeCompare(b.name)));
    await supabase.from('team_members').insert(member);
    return member;
  }, []);

  const deleteMember = useCallback(async (id: string) => {
    setMembers(p => p.filter(m => m.id !== id));
    bg(supabase.from('team_members').delete().eq('id', id));
  }, []);

  return { tasks, members, loading, createTask, updateTask, deleteTask, addComment, updateAssignee, addMember, deleteMember };
}
