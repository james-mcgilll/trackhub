import { useState, useCallback } from 'react';
import type { TodoItem, Priority } from '../types/notes';

const INITIAL_TODOS: TodoItem[] = [
  {
    id: 't1',
    text: 'Send revised proposal to Acme Corp',
    completed: false,
    priority: 'high',
    dueDate: '2024-12-13',
    createdAt: new Date('2024-12-10'),
  },
  {
    id: 't2',
    text: 'Review Q4 pipeline analytics',
    completed: false,
    priority: 'high',
    dueDate: '2024-12-14',
    createdAt: new Date('2024-12-10'),
  },
  {
    id: 't3',
    text: 'Schedule discovery call with DataStream Inc',
    completed: false,
    priority: 'medium',
    dueDate: '2024-12-15',
    createdAt: new Date('2024-12-09'),
  },
  {
    id: 't4',
    text: 'Update CRM records for closed deals',
    completed: true,
    priority: 'medium',
    createdAt: new Date('2024-12-08'),
  },
  {
    id: 't5',
    text: 'Prepare monthly spend report',
    completed: false,
    priority: 'medium',
    dueDate: '2024-12-20',
    createdAt: new Date('2024-12-08'),
  },
  {
    id: 't6',
    text: 'Follow up with NovaTech on contract signing',
    completed: false,
    priority: 'high',
    dueDate: '2024-12-13',
    createdAt: new Date('2024-12-11'),
  },
  {
    id: 't7',
    text: 'Team check-in meeting prep',
    completed: true,
    priority: 'low',
    createdAt: new Date('2024-12-07'),
  },
  {
    id: 't8',
    text: 'Update lead scoring criteria',
    completed: false,
    priority: 'low',
    createdAt: new Date('2024-12-06'),
  },
];

function generateId(): string {
  return `todo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>(INITIAL_TODOS);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');

  const filteredTodos = todos.filter((t) => {
    const matchesStatus =
      filter === 'all' ||
      (filter === 'active' && !t.completed) ||
      (filter === 'completed' && t.completed);
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    return matchesStatus && matchesPriority;
  });

  // Sort: incomplete first, then by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const addTodo = useCallback((text: string, priority: Priority = 'medium') => {
    const newTodo: TodoItem = {
      id: generateId(),
      text,
      completed: false,
      priority,
      createdAt: new Date(),
    };
    setTodos((prev) => [newTodo, ...prev]);
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  }, []);

  const updateTodo = useCallback((id: string, changes: Partial<TodoItem>) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...changes } : t))
    );
  }, []);

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearCompleted = useCallback(() => {
    setTodos((prev) => prev.filter((t) => !t.completed));
  }, []);

  const stats = {
    total: todos.length,
    active: todos.filter((t) => !t.completed).length,
    completed: todos.filter((t) => t.completed).length,
    high: todos.filter((t) => t.priority === 'high' && !t.completed).length,
  };

  return {
    todos: sortedTodos,
    filter,
    setFilter,
    priorityFilter,
    setPriorityFilter,
    addTodo,
    toggleTodo,
    updateTodo,
    deleteTodo,
    clearCompleted,
    stats,
  };
}
