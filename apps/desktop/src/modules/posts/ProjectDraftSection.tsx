import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router';
import { getApiClient } from '../../shared/api/getApiClient';
import type { Goal, ImportReport, Project } from '../../shared/api/types';
import form from '../../shared/ui/form.module.css';
import { buildDraftPrompt } from './buildDraftPrompt';
import { DraftPromptPanel } from './DraftPromptPanel';
import { NotePagePicker } from './NotePagePicker';
import styles from './Posts.module.css';

interface Options {
  goals: Goal[];
  projects: Project[];
}

/** Picks a project and pages, builds the prompt from them and the saved style. `styleVersion` rebuilds it after a style save. */
export function ProjectDraftSection({
  styleVersion,
  onImported,
}: {
  styleVersion: number;
  onImported(report: ImportReport): void;
}) {
  const id = useId();
  const [options, setOptions] = useState<Options | null>(null);
  const [optionsFailed, setOptionsFailed] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [noteIds, setNoteIds] = useState<string[]>([]);
  const [built, setBuilt] = useState<{ prompt: string; styleEmpty: boolean } | null>(null);
  const [contextFailed, setContextFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getApiClient()
      .then((client) => Promise.all([client.listGoals(), client.listProjects()]))
      .then(
        ([goals, projects]) => {
          if (active) setOptions({ goals, projects });
        },
        () => {
          if (active) setOptionsFailed(true);
        },
      );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (projectId === '') return;
    let active = true;
    getApiClient()
      .then((client) =>
        Promise.all([client.getProjectContext(projectId, noteIds), client.getStylePrompt()]),
      )
      .then(
        ([context, style]) => {
          if (!active) return;
          setContextFailed(false);
          setBuilt({
            prompt: buildDraftPrompt({
              topic: context.topic,
              style: style.text,
              source: context.text,
            }),
            styleEmpty: style.text === '',
          });
        },
        () => {
          if (!active) return;
          setBuilt(null);
          setContextFailed(true);
        },
      );
    return () => {
      active = false;
    };
  }, [projectId, noteIds, styleVersion]);

  const body = () => {
    if (optionsFailed) {
      return (
        <p role="alert" className={styles.error}>
          Projeler yüklenemedi.
        </p>
      );
    }
    if (!options) return <p className={styles.muted}>Yükleniyor…</p>;
    if (options.projects.length === 0) {
      return (
        <p className={styles.muted}>
          Önce <Link to="/goals">Hedefler</Link>&apos;den bir proje ekle.
        </p>
      );
    }
    return (
      <>
        <div className={`${form.field} ${styles.field}`}>
          <label htmlFor={`${id}-project`}>Proje</label>
          <select
            id={`${id}-project`}
            className={form.input}
            value={projectId}
            onChange={(event) => {
              setBuilt(null);
              setContextFailed(false);
              setProjectId(event.target.value);
            }}
          >
            <option value="">Proje seç</option>
            {options.goals.map((goal) => {
              const ofGoal = options.projects.filter((project) => project.goalId === goal.id);
              return (
                ofGoal.length > 0 && (
                  <optgroup key={goal.id} label={goal.title}>
                    {ofGoal.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </optgroup>
                )
              );
            })}
          </select>
        </div>
        <NotePagePicker selected={noteIds} onChange={setNoteIds} />
        {contextFailed && (
          <p role="alert" className={styles.error}>
            Proje bilgileri okunamadı.
          </p>
        )}
        {built && projectId !== '' && (
          <DraftPromptPanel
            prompt={built.prompt}
            styleEmpty={built.styleEmpty}
            onImported={onImported}
          />
        )}
      </>
    );
  };

  return (
    <section className={styles.section} aria-labelledby="project-draft">
      <h2 id="project-draft" className={styles.sectionTitle}>
        Projeden taslak
      </h2>
      {body()}
    </section>
  );
}
