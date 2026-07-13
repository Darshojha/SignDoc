'use client';

import { useCallback } from 'react';
import { EditorViewState, clampZoom } from '@/lib/templates/editor';

type FieldEditorToolbarProps = {
  state: EditorViewState;
  onChange: (next: EditorViewState) => void;
};

export function FieldEditorToolbar({ state, onChange }: FieldEditorToolbarProps) {
  const update = useCallback(
    (patch: Partial<EditorViewState>) => {
      const next = { ...state, ...patch };
      if ('zoom' in patch) {
        next.zoom = clampZoom(next.zoom);
      }
      onChange(next);
    },
    [onChange, state],
  );

  return (
      <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => update({ zoom: clampZoom(state.zoom - 0.1) })}
            className="rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--surface-raised-hover)]"
          >
            -
          </button>
          <span className="text-xs font-medium text-[var(--color-text-primary)]">{Math.round(state.zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => update({ zoom: clampZoom(state.zoom + 0.1) })}
            className="rounded-[var(--radius-sm)] px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--surface-raised-hover)]"
          >
            +
          </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => update({ snapMode: 'none', selectedFieldIds: [] })}
          className={`rounded-[var(--radius-sm)] px-2 py-1 text-xs ${state.snapMode === 'none' ? 'bg-[var(--surface-raised-hover)] font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--surface-raised-hover)]'}`}
        >
          None
        </button>
        <button
          type="button"
          onClick={() => update({ snapMode: 'grid' })}
          className={`rounded-[var(--radius-sm)] px-2 py-1 text-xs ${state.snapMode === 'grid' ? 'bg-[var(--surface-raised-hover)] font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--surface-raised-hover)]'}`}
        >
          Snap to grid
        </button>
      </div>
    </div>
  );
}