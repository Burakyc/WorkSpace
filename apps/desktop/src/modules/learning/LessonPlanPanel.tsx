import { useId, useState } from 'react';
import { getApiClient } from '../../shared/api/getApiClient';
import {
  DEFAULT_POMODORO_SETTINGS,
  type LessonItem,
  type TopicSummary,
} from '../../shared/api/types';
import buttons from '../../shared/ui/buttons.module.css';
import form from '../../shared/ui/form.module.css';
import { AiContentPanel } from '../ai/AiContentPanel';
import styles from '../content/Content.module.css';
import { levelLabel } from '../content/levelLabel';
import { buildLessonPlanPrompt, type PlanLanguage } from './lessonPlanPrompt';

export const LANGUAGE_KEY = 'devpath.learning.planLanguage';
const LEVELS = ['beginner', 'intermediate', 'advanced'];

function loadLanguage(): PlanLanguage {
  try {
    return localStorage.getItem(LANGUAGE_KEY) === 'tr' ? 'tr' : 'en';
  } catch {
    return 'en';
  }
}

function saveLanguage(language: PlanLanguage) {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // Storage blocked: the choice lasts until the panel closes.
  }
}

interface LessonPlanPanelProps {
  topics: TopicSummary[];
  onImported(): void;
}

/** The AI teacher: a form that builds the prompt for a topic, then runs it through the Learning module's AI mode. */
export function LessonPlanPanel({ topics, onImported }: LessonPlanPanelProps) {
  const id = useId();
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('beginner');
  const [parts, setParts] = useState('');
  const [language, setLanguage] = useState(loadLanguage);
  const [background, setBackground] = useState('');
  // The built prompt and the form values it was built from; it only applies while they still match.
  const [built, setBuilt] = useState<{ inputs: string; prompt: string } | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildFailed, setBuildFailed] = useState(false);

  const existing = topics.find((t) => t.topic === topic.trim());
  const partCount = parts === '' ? null : Number(parts);
  const partsValid =
    partCount === null || (Number.isInteger(partCount) && partCount >= 1 && partCount <= 50);

  async function buildPrompt(): Promise<string> {
    const client = await getApiClient();
    const settings = await client.getSettings().catch(() => null);
    const lesson = existing && (await client.getTopic<LessonItem>('lesson', existing.slug));
    return buildLessonPlanPrompt({
      topic,
      level: existing?.level ?? level,
      parts: partCount,
      language,
      background,
      focusMinutes: (settings?.pomodoro ?? DEFAULT_POMODORO_SETTINGS).focusMinutes,
      existingParts: lesson ? lesson.items.map((item) => item.title) : [],
    });
  }

  const inputs = JSON.stringify([topic.trim(), level, parts, language, background]);

  function build() {
    setBuilding(true);
    setBuildFailed(false);
    buildPrompt()
      .then(
        (prompt) => setBuilt({ inputs, prompt }),
        () => setBuildFailed(true),
      )
      .finally(() => setBuilding(false));
  }

  return (
    <>
      <section className={styles.panel} aria-labelledby={`${id}-title`}>
        <h2 id={`${id}-title`} className={styles.panelTitle}>
          Ders planı
        </h2>
        <div className={form.field}>
          <label htmlFor={`${id}-topic`}>Konu</label>
          <input
            id={`${id}-topic`}
            className={form.input}
            list={`${id}-topics`}
            maxLength={120}
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
          />
          <datalist id={`${id}-topics`}>
            {topics.map((t) => (
              <option key={t.slug} value={t.topic} />
            ))}
          </datalist>
          {existing && (
            <p className={styles.muted}>
              Bu ders zaten var; yeni parçalar eklenir, mevcut parçalar değişmez.
            </p>
          )}
        </div>
        <div className={form.field}>
          <label htmlFor={`${id}-level`}>Seviye</label>
          <select
            id={`${id}-level`}
            className={form.input}
            disabled={existing !== undefined}
            value={existing?.level ?? level}
            onChange={(event) => setLevel(event.target.value)}
          >
            {LEVELS.map((value) => (
              <option key={value} value={value}>
                {levelLabel(value)}
              </option>
            ))}
          </select>
        </div>
        <div className={form.field}>
          <label htmlFor={`${id}-parts`}>Parça sayısı (isteğe bağlı)</label>
          <input
            id={`${id}-parts`}
            className={form.input}
            type="number"
            min={1}
            max={50}
            value={parts}
            aria-invalid={partsValid ? undefined : true}
            aria-describedby={partsValid ? undefined : `${id}-parts-error`}
            onChange={(event) => setParts(event.target.value)}
          />
          {!partsValid && (
            <p id={`${id}-parts-error`} className={form.fieldError}>
              1 ile 50 arasında olmalı.
            </p>
          )}
        </div>
        <div className={form.field}>
          <label htmlFor={`${id}-language`}>İçerik dili</label>
          <select
            id={`${id}-language`}
            className={form.input}
            value={language}
            onChange={(event) => {
              const chosen = event.target.value === 'tr' ? 'tr' : 'en';
              setLanguage(chosen);
              saveLanguage(chosen);
            }}
          >
            <option value="en">İngilizce</option>
            <option value="tr">Türkçe</option>
          </select>
        </div>
        <div className={form.field}>
          <label htmlFor={`${id}-background`}>Bildiklerim / hedefim (isteğe bağlı)</label>
          <textarea
            id={`${id}-background`}
            className={form.input}
            rows={2}
            maxLength={500}
            value={background}
            onChange={(event) => setBackground(event.target.value)}
          />
        </div>
        <div>
          <button
            type="button"
            className={buttons.primary}
            disabled={topic.trim() === '' || !partsValid || building}
            onClick={build}
          >
            Promptu oluştur
          </button>
        </div>
        {buildFailed && (
          <p role="alert" className={styles.error}>
            Prompt oluşturulamadı.
          </p>
        )}
        {built && built.inputs !== inputs && (
          <p className={styles.muted}>Form değişti; promptu yeniden oluştur.</p>
        )}
      </section>
      {built?.inputs === inputs && (
        <AiContentPanel
          module="learning"
          type="lesson"
          prompt={built.prompt}
          onImported={() => onImported()}
        />
      )}
    </>
  );
}
