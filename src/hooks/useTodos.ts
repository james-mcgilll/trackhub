import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import type { TodoItem, Priority } from '../types/notes';

const uid = () => `todo_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
const bg  = (p: PromiseLike<unknown>) => Promise.resolve(p).catch(() => {});

function rowToTodo(r: any): TodoItem {
  return {
    id:        r.id,
    text:      r.text,
    completed: r.completed,
    priority:  r.priority,
    dueDate:   r.due_date ?? undefined,
    createdAt: new Date(r.created_at),
  };
}

export function useTodos() {
  const [todos,          setTodos]          = useState<TodoItem[]>([]);
  const [filter,         setFilter]         = useState<'all'|'active'|'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority|'all'>('all');
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('todos')
          .select('*')
          .order('created_at', { ascending: false });
        if (error?.code === '42P01') { setLoading(false); return; }
        if (!error && data) setTodos(data.map(rowToTodo));
      } catch { /* table may not exist yet */ }
      finally { setLoading(false); }
    })();

    const ch = supabase.channel(`todos_rt_${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' },
        ({ eventType, new: n, old: o }) => {
          if (eventType === 'INSERT') setTodos(prev => prev.find(x => x.id === (n as any).id) ? prev : [rowToTodo(n), ...prev]);
          if (eventType === 'UPDATE') setTodos(prev => prev.map(x => x.id === (n as any).id ? rowToTodo(n) : x));
          if (eventType === 'DELETE') setTodos(prev => prev.filter(x => x.id !== (o as any).id));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filteredTodos = todos.filter(t => {
    const matchesStatus   = filter === 'all' || (filter === 'active' && !t.completed) || (filter === 'completed' && t.completed);
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const addTodo = useCallback((text: string, priority: Priority = 'medium') => {
    const now = new Date();
    const todo: TodoItem = { id: uid(), text, completed: false, priority, createdAt: now };
    setTodos(prev => [todo, ...prev]);
    bg(supabase.from('todos').insert({ id: todo.id, text, completed: false, priority, created_at: now.toISOString() }));
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== id) return t;
      const completed = !t.completed;
      bg(supabase.from('todos').update({ completed }).eq('id', id));
      return { ...t, completed };
    }));
  }, []);

  const updateTodo = useCallback((id: string, changes: Partial<TodoItem>) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t));
    const dbChanges: any = {};
    if (changes.text      !== undefined) dbChanges.text     = changes.text;
    if (changes.priority  !== undefined) dbChanges.priority = changes.priority;
    if (changes.dueDate   !== undefined) dbChanges.due_date = changes.dueDate;
    if (changes.completed !== undefined) dbChanges.completed = changes.completed;
    bg(supabase.from('todos').update(dbChanges).eq('id', id));
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id));
    bg(supabase.from('todos').delete().eq('id', id));
  }, []);

  const clearCompleted = useCallback(() => {
    setTodos(prev => {
      const completed = prev.filter(t => t.completed);
      completed.forEach(t => bg(supabase.from('todos').delete().eq('id', t.id)));
      return prev.filter(t => !t.completed);
    });
  }, []);

  const stats = {
    total:     todos.length,
    active:    todos.filter(t => !t.completed).length,
    completed: todos.filter(t => t.completed).length,
    high:      todos.filter(t => t.priority === 'high' && !t.completed).length,
  };

  return { todos: sortedTodos, filter, setFilter, priorityFilter, setPriorityFilter, addTodo, toggleTodo, updateTodo, deleteTodo, clearCompleted, stats, loading };
}
