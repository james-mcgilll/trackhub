import { useState, useCallback } from 'react';
import type { Note, NoteColor } from '../types/notes';

const INITIAL_NOTES: Note[] = [
  {
    id: '1',
    title: 'Q4 Strategy Planning',
    content: 'Review lead pipeline and identify top 10 accounts for aggressive outreach. Focus on enterprise segment and prepare tailored proposals.',
    color: 'yellow',
    pinned: true,
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date('2024-12-10'),
    tags: ['strategy', 'Q4'],
  },
  {
    id: '2',
    title: 'Client Meeting Notes — Acme Corp',
    content: 'Discussed scope for Phase 2 integration. Budget approved at $45k. Need to send revised proposal by Friday. Contact: Sarah Lee (VP Engineering).',
    color: 'blue',
    pinned: false,
    createdAt: new Date('2024-12-05'),
    updatedAt: new Date('2024-12-05'),
    tags: ['client', 'acme'],
  },
  {
    id: '3',
    title: 'Follow-up checklist',
    content: '- Email DataStream about demo\n- Confirm call with NovaTech\n- Send contract to GlobalTech\n- Review Bright Solutions proposal',
    color: 'green',
    pinned: false,
    createdAt: new Date('2024-12-08'),
    updatedAt: new Date('2024-12-09'),
    tags: ['follow-up'],
  },
  {
    id: '4',
    title: 'Product feedback — Sprint 12',
    content: 'Dashboard load time needs improvement. Users requesting bulk export feature. Mobile responsiveness still an issue on some screens.',
    color: 'pink',
    pinned: false,
    createdAt: new Date('2024-12-10'),
    updatedAt: new Date('2024-12-10'),
    tags: ['product', 'feedback'],
  },
  {
    id: '5',
    title: 'Sales targets December',
    content: '$120k monthly target. Current pipeline: $87k. Need $33k more — 2–3 mid-range deals or 1 enterprise close.',
    color: 'purple',
    pinned: true,
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date('2024-12-11'),
    tags: ['sales', 'targets'],
  },
];

function generateId(): string {
  return `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [search, setSearch] = useState('');

  const filteredNotes = search
    ? notes.filter(
        (n) =>
          n.title.toLowerCase().includes(search.toLowerCase()) ||
          n.content.toLowerCase().includes(search.toLowerCase()) ||
          n.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : notes;

  const pinnedNotes = filteredNotes.filter((n) => n.pinned);
  const unpinnedNotes = filteredNotes.filter((n) => !n.pinned);

  const addNote = useCallback(() => {
    const newNote: Note = {
      id: generateId(),
      title: 'Untitled note',
      content: '',
      color: 'white',
      pinned: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
    };
    setNotes((prev) => [newNote, ...prev]);
    return newNote.id;
  }, []);

  const updateNote = useCallback((id: string, changes: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, ...changes, updatedAt: new Date() } : n
      )
    );
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const togglePin = useCallback((id: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, pinned: !n.pinned, updatedAt: new Date() } : n))
    );
  }, []);

  const changeColor = useCallback((id: string, color: NoteColor) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, color, updatedAt: new Date() } : n))
    );
  }, []);

  return {
    notes: filteredNotes,
    pinnedNotes,
    unpinnedNotes,
    search,
    setSearch,
    addNote,
    updateNote,
    deleteNote,
    togglePin,
    changeColor,
    total: notes.length,
  };
}
