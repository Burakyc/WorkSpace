import { useId } from 'react';
import { AiModeSelect } from '../ai/AiModeSelect';
import { AI_MODULES } from '../ai/aiModes';
import { useAiMode } from '../ai/useAiMode';
import type { AiModule } from '../../shared/api/types';
import styles from './SettingsPage.module.css';

function ModuleRow({ module, label }: { module: AiModule; label: string }) {
  return <AiModeSelect label={label} state={useAiMode(module)} />;
}

/** Ayarlar → how each module gets AI content; the same setting as the select in the module's panel. */
export function AiModesSection() {
  const id = useId();
  return (
    <section className={styles.card} aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className={styles.heading}>
        Yapay zekâ modları
      </h2>
      <p className={styles.note}>
        Yapay zekâ içeriğini her modülün nasıl aldığını seçer. Şimdilik yalnızca kopyala-yapıştır
        kullanılabilir.
      </p>
      {AI_MODULES.map(({ id: module, label }) => (
        <ModuleRow key={module} module={module} label={label} />
      ))}
    </section>
  );
}
