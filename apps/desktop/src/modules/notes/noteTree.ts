import type { NoteNode } from '../../shared/api/types';

/** The children of `parentId` (null = top level), sorted by `order`. */
export function childrenOf(nodes: readonly NoteNode[], parentId: string | null): NoteNode[] {
  return nodes.filter((n) => n.parentId === parentId).sort((a, b) => a.order - b.order);
}

/** The ancestors of `id`, top level first; empty for a top-level or unknown node. */
export function ancestorsOf(nodes: readonly NoteNode[], id: string): NoteNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const path: NoteNode[] = [];
  let parentId = byId.get(id)?.parentId ?? null;
  // The size guard stops on a corrupt cycle instead of looping forever.
  while (parentId !== null && path.length < nodes.length) {
    const parent = byId.get(parentId);
    if (!parent) break;
    path.unshift(parent);
    parentId = parent.parentId;
  }
  return path;
}

/** The ids of every node under `id`. */
export function descendantIds(nodes: readonly NoteNode[], id: string): Set<string> {
  const found = new Set<string>();
  const queue = [id];
  for (let current = queue.pop(); current !== undefined; current = queue.pop()) {
    for (const child of nodes) {
      if (child.parentId === current && !found.has(child.id)) {
        found.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return found;
}

/** Every node in tree order with its depth (0 = top level). */
export function flatten(
  nodes: readonly NoteNode[],
  parentId: string | null = null,
  depth = 0,
): { node: NoteNode; depth: number }[] {
  return childrenOf(nodes, parentId).flatMap((node) => [
    { node, depth },
    ...flatten(nodes, node.id, depth + 1),
  ]);
}

/** Where `id` can be moved: every node except itself and its descendants, in tree order. */
export function moveTargets(nodes: readonly NoteNode[], id: string) {
  const excluded = descendantIds(nodes, id).add(id);
  return flatten(nodes).filter(({ node }) => !excluded.has(node.id));
}
