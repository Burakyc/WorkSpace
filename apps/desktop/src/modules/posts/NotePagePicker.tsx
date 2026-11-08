import { useEffect, useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import type { NoteNode } from '../../shared/api/types';
import styles from './Posts.module.css';

export const MAX_NOTE_PAGES = 10;

/** Ticks note pages for the prompt; pages aren't linked to projects, so the user picks them. */
export function NotePagePicker({
  selected,
  onChange,
}: {
  selected: readonly string[];
  onChange(next: string[]): void;
}) {
  const [pages, setPages] = useState<NoteNode[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => client.listNotes())
      .then(
        (nodes) => {
          if (active) setPages(nodes.filter((node) => node.kind === 'page'));
        },
        () => {
          if (active) setFailed(true);
        },
      );
    return () => {
      active = false;
    };
  }, []);

  return (
    <details>
      <summary>Not sayfaları (isteğe bağlı)</summary>
      {failed && (
        <p role="alert" className={styles.error}>
          Not sayfaları okunamadı.
        </p>
      )}
      {pages?.length === 0 && <p className={styles.muted}>Henüz not sayfası yok.</p>}
      {pages && pages.length > 0 && (
        <ul className={styles.pages}>
          {pages.map((page) => {
            const checked = selected.includes(page.id);
            return (
              <li key={page.id}>
                <label>
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={!checked && selected.length >= MAX_NOTE_PAGES}
                    onChange={() =>
                      onChange(
                        checked ? selected.filter((id) => id !== page.id) : [...selected, page.id],
                      )
                    }
                  />{' '}
                  {page.title}
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}
