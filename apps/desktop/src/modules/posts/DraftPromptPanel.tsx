import type { ImportReport } from '../../shared/api/types';
import form from '../../shared/ui/form.module.css';
import { AiContentPanel } from '../ai/AiContentPanel';
import styles from './Posts.module.css';

/** Shows the built prompt, which carries the user's own text, and runs it through the module's AI mode. */
export function DraftPromptPanel({
  prompt,
  styleEmpty,
  onImported,
}: {
  prompt: string;
  styleEmpty: boolean;
  onImported(report: ImportReport): void;
}) {
  return (
    <>
      {styleEmpty && (
        <p className={styles.muted}>Stil promptun boş; taslak varsayılan üslupla yazılır.</p>
      )}
      <details>
        <summary>Hazırlanan prompt</summary>
        <textarea
          aria-label="Hazırlanan prompt"
          className={form.input}
          rows={14}
          readOnly
          value={prompt}
        />
      </details>
      <AiContentPanel module="posts" type="post" prompt={prompt} onImported={onImported} />
    </>
  );
}
