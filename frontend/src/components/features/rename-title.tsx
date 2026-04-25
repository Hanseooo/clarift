'use client';

import { useState } from 'react';
import { PencilIcon } from 'lucide-react';

interface RenameTitleProps {
  id: string;
  currentTitle: string | null;
  onSave: (id: string, title: string) => Promise<void>;
}

export function RenameTitle({ id, currentTitle, onSave }: RenameTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(currentTitle ?? '');
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    const trimmed = title.trim();
    if (!trimmed || trimmed === currentTitle) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(id, trimmed);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to rename:', error);
    } finally {
      setIsSaving(false);
    }
  }

  if (isEditing) {
    return (
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') {
            setTitle(currentTitle ?? '');
            setIsEditing(false);
          }
        }}
        maxLength={32}
        autoFocus
        disabled={isSaving}
        className="rounded border border-border-default px-2 py-1 text-sm bg-surface-card text-text-primary focus:border-brand-500 focus:outline-none"
      />
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      className="group flex items-center gap-1"
      type="button"
    >
      <span className="font-medium">{currentTitle ?? 'Untitled'}</span>
      <PencilIcon className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-50" />
    </button>
  );
}
