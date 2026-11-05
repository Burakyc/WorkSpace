import { useState } from 'react';
import type { NoteNode } from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import type { TreeState } from './NoteTree';
import { moveTargets } from './treeHelpers';
import styles from './NotesPage.module.css';

const TOP = '';

/** "Taşı…": pick a new parent from every item except the item itself and its descendants. */
export function MovePanel({ node, tree }: { node: NoteNode; tree: TreeState }) {
  const [target, setTarget] = useState(node.parentId ?? TOP);

  return (
    <div role="dialog" aria-label={`${node.title} taşı`} className={styles.panel}>
      <label className={form.field}>
        <span>Nereye?</span>
        <select
          className={form.input}
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        >
          <option value={TOP}>En üst seviye</option>
          {moveTargets(tree.nodes, node.id).map(({ node: option, depth }) => (
            <option key={option.id} value={option.id}>
              {`${'  '.repeat(depth)}${option.title}`}
            </option>
          ))}
        </select>
      </label>
      <div className={form.actions}>
        <button
          type="button"
          className={buttons.primary}
          onClick={() => {
            tree.setPanel(null);
            void tree.actions.move(node.id, target === TOP ? null : target);
          }}
        >
          Taşı
        </button>
        <button type="button" className={buttons.secondary} onClick={() => tree.setPanel(null)}>
          Vazgeç
        </button>
      </div>
    </div>
  );
}
