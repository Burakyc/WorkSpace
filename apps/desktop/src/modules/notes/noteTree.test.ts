import { describe, expect, it } from 'vitest';
import { noteNode } from './testing/noteNode';
import { ancestorsOf, childrenOf, descendantIds, moveTargets } from './noteTree';

// top ─┬─ b (order 1)
//      └─ a (order 0) ── deep
// other
const nodes = [
  noteNode({ id: 'top', title: 'Top', order: 0 }),
  noteNode({ id: 'b', title: 'B', parentId: 'top', order: 1 }),
  noteNode({ id: 'a', title: 'A', parentId: 'top', order: 0 }),
  noteNode({ id: 'deep', title: 'Deep', parentId: 'a', order: 0 }),
  noteNode({ id: 'other', title: 'Other', order: 1 }),
];

describe('noteTree', () => {
  it('sorts children by order', () => {
    expect(childrenOf(nodes, 'top').map((n) => n.id)).toEqual(['a', 'b']);
    expect(childrenOf(nodes, null).map((n) => n.id)).toEqual(['top', 'other']);
  });

  it('finds the ancestors top first', () => {
    expect(ancestorsOf(nodes, 'deep').map((n) => n.id)).toEqual(['top', 'a']);
    expect(ancestorsOf(nodes, 'top')).toEqual([]);
    expect(ancestorsOf(nodes, 'missing')).toEqual([]);
  });

  it('finds every descendant', () => {
    expect([...descendantIds(nodes, 'top')].sort()).toEqual(['a', 'b', 'deep']);
    expect(descendantIds(nodes, 'other').size).toBe(0);
  });

  it('leaves the item and its descendants out of the move targets', () => {
    expect(moveTargets(nodes, 'a').map(({ node, depth }) => `${depth}:${node.id}`)).toEqual([
      '0:top',
      '1:b',
      '0:other',
    ]);
  });
});
