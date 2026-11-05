import type { NoteNode } from '../../../shared/api/types';

/** A test node: a top-level page created and edited on 5 November 2026 unless overridden. */
export function noteNode(overrides: Partial<NoteNode> & Pick<NoteNode, 'id' | 'title'>): NoteNode {
  return {
    parentId: null,
    kind: 'page',
    order: 0,
    createdAt: '2026-11-05T09:00:00Z',
    updatedAt: '2026-11-05T09:00:00Z',
    ...overrides,
  };
}
