import { useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { getApiClient } from '../../shared/api/getApiClient';
import type { Highlight, NoteSearchResult } from '../../shared/api/types';
import form from '../../shared/ui/form.module.css';
import styles from './NotesPage.module.css';

type State =
  | { kind: 'idle' }
  | { kind: 'short' }
  | { kind: 'loading' }
  | { kind: 'failed' }
  | { kind: 'done'; results: NoteSearchResult[] };

/** The search box above the tree. Enter searches; while results are shown they replace `children` (the tree). */
export function NoteSearch({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  // Only the answer to the latest search is shown.
  const latest = useRef(0);

  function clear() {
    latest.current++;
    setQuery('');
    setState({ kind: 'idle' });
  }

  function search() {
    const trimmed = query.trim();
    if (trimmed === '') return clear();
    if (trimmed.length < 2) return setState({ kind: 'short' });
    const id = ++latest.current;
    setState({ kind: 'loading' });
    getApiClient()
      .then((client) => client.searchNotes(trimmed))
      .then(
        (results) => {
          if (id === latest.current) setState({ kind: 'done', results });
        },
        () => {
          if (id === latest.current) setState({ kind: 'failed' });
        },
      );
  }

  return (
    <>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          search();
        }}
      >
        <input
          type="search"
          className={form.input}
          aria-label="Notlarda ara"
          placeholder="Ara…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (event.target.value === '') clear();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') clear();
          }}
        />
      </form>
      {state.kind === 'idle' && children}
      {state.kind === 'short' && <p className={styles.muted}>En az 2 karakter yaz.</p>}
      {state.kind === 'loading' && <p className={styles.muted}>Aranıyor…</p>}
      {state.kind === 'failed' && (
        <p role="alert" className={styles.error}>
          Arama yapılamadı.
        </p>
      )}
      {state.kind === 'done' && <Results results={state.results} />}
    </>
  );
}

function Results({ results }: { results: NoteSearchResult[] }) {
  if (results.length === 0) return <p className={styles.muted}>Sonuç yok.</p>;
  return (
    <section aria-label="Arama sonuçları">
      <p className={styles.muted}>{results.length} sonuç</p>
      <ul className={styles.results}>
        {results.map((r) => (
          <li key={r.id} className={styles.result}>
            <Link to={`/notes/${r.id}`} className={styles.resultTitle}>
              {r.title}
            </Link>
            {r.path.length > 0 && <span className={styles.muted}>{r.path.join(' / ')}</span>}
            {r.snippet && <Snippet text={r.snippet} highlights={r.highlights} />}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** The snippet as text, with `<mark>` around each highlight. */
function Snippet({ text, highlights }: { text: string; highlights: Highlight[] }) {
  const parts: ReactNode[] = [];
  let at = 0;
  for (const { start, length } of highlights) {
    if (start < at || start + length > text.length) continue;
    parts.push(text.slice(at, start), <mark key={start}>{text.slice(start, start + length)}</mark>);
    at = start + length;
  }
  parts.push(text.slice(at));
  return <p className={styles.snippet}>{parts}</p>;
}
