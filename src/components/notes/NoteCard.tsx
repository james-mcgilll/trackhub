import React, { useState, useRef, useEffect } from 'react';
import { Pin, PinOff, Trash2, Palette } from 'lucide-react';
import type { Note, NoteColor } from '../../types/notes';

interface NoteCardProps {
  note: Note;
  onUpdate: (id: string, changes: Partial<Note>) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onChangeColor: (id: string, color: NoteColor) => void;
}

const colorMap: Record<NoteColor, { bg: string; border: string; text: string }> = {
  white: { bg: 'bg-white', border: 'border-slate-100', text: 'text-slate-700' },
  yellow: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-900' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-900' },
  green: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-900' },
  pink: { bg: 'bg-pink-50', border: 'border-pink-100', text: 'text-pink-900' },
  purple: { bg: 'bg-violet-50', border: 'border-violet-100', text: 'text-violet-900' },
};

const colorOptions: { color: NoteColor; hex: string }[] = [
  { color: 'white', hex: '#ffffff' },
  { color: 'yellow', hex: '#fef3c7' },
  { color: 'blue', hex: '#eff6ff' },
  { color: 'green', hex: '#ecfdf5' },
  { color: 'pink', hex: '#fdf2f8' },
  { color: 'purple', hex: '#f5f3ff' },
];

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  onUpdate,
  onDelete,
  onTogglePin,
  onChangeColor,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(note.title);
  const [localContent, setLocalContent] = useState(note.content);
  const colorRef = useRef<HTMLDivElement>(null);

  const colors = colorMap[note.color];

  // Close color picker when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colorRef.current && !colorRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBlur = () => {
    setEditing(false);
    if (localTitle !== note.title || localContent !== note.content) {
      onUpdate(note.id, { title: localTitle, content: localContent });
    }
  };

  const formatDate = (d: Date) =>
    new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(d);

  return (
    <div
      className={`
        group relative rounded-2xl border p-4 flex flex-col gap-3
        hover:shadow-md transition-all duration-200
        ${colors.bg} ${colors.border}
      `}
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      {/* Pin indicator */}
      {note.pinned && (
        <div className="absolute top-3 right-3">
          <Pin size={13} className="text-slate-400 rotate-45" />
        </div>
      )}

      {/* Title */}
      {editing ? (
        <input
          className={`text-sm font-semibold bg-transparent outline-none w-full ${colors.text}`}
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={handleBlur}
          autoFocus
        />
      ) : (
        <h3
          className={`text-sm font-semibold leading-snug pr-5 cursor-text ${colors.text}`}
          onClick={() => setEditing(true)}
        >
          {note.title}
        </h3>
      )}

      {/* Content */}
      {editing ? (
        <textarea
          className={`text-xs bg-transparent outline-none w-full resize-none leading-relaxed ${colors.text} opacity-80`}
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          onBlur={handleBlur}
          rows={4}
        />
      ) : (
        <p
          className={`text-xs leading-relaxed line-clamp-5 cursor-text ${colors.text} opacity-75`}
          onClick={() => setEditing(true)}
          style={{ whiteSpace: 'pre-wrap' }}
        >
          {note.content || <span className="italic opacity-50">Click to add content...</span>}
        </p>
      )}

      {/* Tags */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.map((tag) => (
            <span
              key={tag}
              className={`text-xs px-1.5 py-0.5 rounded-md font-medium opacity-60 ${colors.text} bg-black/5`}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className={`text-xs opacity-40 ${colors.text}`}>{formatDate(note.updatedAt)}</span>

        {/* Actions - show on hover */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Color picker */}
          <div className="relative" ref={colorRef}>
            <button
              className={`p-1.5 rounded-lg hover:bg-black/5 transition-colors ${colors.text} opacity-60 hover:opacity-100`}
              onClick={() => setShowColorPicker(!showColorPicker)}
              title="Change color"
            >
              <Palette size={13} />
            </button>
            {showColorPicker && (
              <div className="absolute bottom-full mb-1 right-0 bg-white border border-slate-100 rounded-xl p-2 shadow-lg z-20 flex gap-1">
                {colorOptions.map(({ color, hex }) => (
                  <button
                    key={color}
                    className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                      note.color === color ? 'border-blue-500 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: hex, boxShadow: '0 0 0 1px rgba(0,0,0,0.1)' }}
                    onClick={() => {
                      onChangeColor(note.id, color);
                      setShowColorPicker(false);
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pin/Unpin */}
          <button
            className={`p-1.5 rounded-lg hover:bg-black/5 transition-colors ${colors.text} opacity-60 hover:opacity-100`}
            onClick={() => onTogglePin(note.id)}
            title={note.pinned ? 'Unpin' : 'Pin'}
          >
            {note.pinned ? <PinOff size={13} /> : <Pin size={13} />}
          </button>

          {/* Delete */}
          <button
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
            onClick={() => onDelete(note.id)}
            title="Delete note"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
