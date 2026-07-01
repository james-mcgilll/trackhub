import React, { useState } from 'react';
import {
  NotebookPen,
  CheckSquare,
  Plus,
  Search,
  Pin,
  StickyNote,
  ListTodo,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { NoteCard } from '../components/notes/NoteCard';
import { TodoListComponent } from '../components/notes/TodoList';
import { useNotes } from '../hooks/useNotes';
import { useTodos } from '../hooks/useTodos';

type Tab = 'notes' | 'todos';

export const NotesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('notes');

  const {
    pinnedNotes,
    unpinnedNotes,
    search,
    setSearch,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
    changeColor,
    total: totalNotes,
  } = useNotes();

  const {
    todos,
    filter,
    setFilter,
    priorityFilter,
    setPriorityFilter,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    clearCompleted,
    stats,
  } = useTodos();

  return (
    <div className="space-y-6 max-w-screen-xl">
      <PageHeader
        title="Notes & To-Do"
        subtitle="Capture ideas, track tasks, and stay organized"
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'notes' && (
              <button
                onClick={addNote}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200"
              >
                <Plus size={15} />
                New Note
              </button>
            )}
          </div>
        }
      />

      {/* Tab bar + stats */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-slate-100 rounded-2xl p-1"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
        >
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'notes'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <StickyNote size={15} />
            Notes
            <span className={`text-xs px-1.5 py-0.5 rounded-md ${
              activeTab === 'notes' ? 'bg-blue-500 text-blue-100' : 'bg-slate-100 text-slate-500'
            }`}>
              {totalNotes}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('todos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'todos'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ListTodo size={15} />
            To-Do
            <span className={`text-xs px-1.5 py-0.5 rounded-md ${
              activeTab === 'todos' ? 'bg-blue-500 text-blue-100' : 'bg-slate-100 text-slate-500'
            }`}>
              {stats.active}
            </span>
          </button>
        </div>

        {/* Notes search (only when notes tab active) */}
        {activeTab === 'notes' && (
          <div className="flex items-center gap-2 bg-white border border-slate-100 rounded-xl px-3 py-2 w-64 focus-within:border-blue-300 transition-colors"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
          >
            <Search size={14} className="text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search notes..."
              className="flex-1 text-sm text-slate-700 placeholder-slate-400 outline-none bg-transparent"
            />
          </div>
        )}
      </div>

      {/* Notes tab */}
      {activeTab === 'notes' && (
        <div className="space-y-6">
          {/* Pinned notes */}
          {pinnedNotes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Pin size={13} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Pinned
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {pinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onUpdate={updateNote}
                    onDelete={deleteNote}
                    onTogglePin={togglePin}
                    onChangeColor={changeColor}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All other notes */}
          {unpinnedNotes.length > 0 && (
            <div>
              {pinnedNotes.length > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <NotebookPen size={13} className="text-slate-400" />
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Other Notes
                  </span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {unpinnedNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onUpdate={updateNote}
                    onDelete={deleteNote}
                    onTogglePin={togglePin}
                    onChangeColor={changeColor}
                  />
                ))}
                {/* Add new note button */}
                <button
                  onClick={addNote}
                  className="rounded-2xl border-2 border-dashed border-slate-200 p-4 flex flex-col items-center justify-center gap-2 text-slate-300 hover:text-slate-400 hover:border-slate-300 hover:bg-slate-50/50 transition-all min-h-32"
                >
                  <Plus size={20} />
                  <span className="text-sm font-medium">New note</span>
                </button>
              </div>
            </div>
          )}

          {/* Empty state */}
          {pinnedNotes.length === 0 && unpinnedNotes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <StickyNote size={28} className="text-slate-300" />
              </div>
              <h3 className="text-base font-semibold text-slate-500 mb-1">
                {search ? 'No notes match your search' : 'No notes yet'}
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                {search ? 'Try different keywords' : 'Create your first note to get started'}
              </p>
              {!search && (
                <button
                  onClick={addNote}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <Plus size={15} />
                  Create Note
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* To-Do tab */}
      {activeTab === 'todos' && (
        <div className="bg-white rounded-2xl border border-slate-100 p-5"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)', minHeight: '500px' }}
        >
          <div className="flex items-center gap-2 mb-5">
            <CheckSquare size={18} className="text-blue-600" />
            <h2 className="text-sm font-semibold text-slate-700">Task List</h2>
            <div className="ml-auto flex items-center gap-3 text-xs text-slate-400">
              <span>{stats.completed} of {stats.total} done</span>
              {/* Progress bar */}
              <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.total > 0 ? (stats.completed / stats.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
          <TodoListComponent
            todos={todos}
            filter={filter}
            setFilter={setFilter}
            priorityFilter={priorityFilter}
            setPriorityFilter={setPriorityFilter}
            onAdd={addTodo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            onUpdate={updateTodo}
            onClearCompleted={clearCompleted}
            stats={stats}
          />
        </div>
      )}
    </div>
  );
};
