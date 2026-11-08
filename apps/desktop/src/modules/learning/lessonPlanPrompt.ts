import { lessonPlanTemplate } from '../content/prompts';

export type PlanLanguage = 'en' | 'tr';

export interface LessonPlanInput {
  topic: string;
  level: string;
  /** Null lets the AI decide. */
  parts: number | null;
  language: PlanLanguage;
  background: string;
  focusMinutes: number;
  /** Part titles of the lesson being continued. */
  existingParts: string[];
}

const LANGUAGE_NAMES: Readonly<Record<PlanLanguage, string>> = { en: 'English', tr: 'Turkish' };

function details({ background, existingParts }: LessonPlanInput): string {
  let text = '';
  if (background.trim() !== '') {
    text += `\nWhat the learner already knows and wants: ${background.trim()}`;
  }
  if (existingParts.length > 0) {
    const list = existingParts.map((title) => `\n- ${title}`).join('');
    text += `\nThe lesson already has these parts. Do not repeat them; continue after them:${list}`;
  }
  return text;
}

/** The teacher prompt for a topic. One pass, so user text with `{{level}}` or `$&` stays literal. */
export function buildLessonPlanPrompt(input: LessonPlanInput): string {
  const values: Readonly<Record<string, string>> = {
    topic: input.topic.trim(),
    level: input.level,
    language: LANGUAGE_NAMES[input.language],
    parts: input.parts === null ? 'your choice, as few as the topic allows' : String(input.parts),
    details: details(input),
    focusMinutes: String(input.focusMinutes),
  };
  return lessonPlanTemplate.replace(/\{\{(\w+)\}\}/g, (_, name: string) => values[name] ?? '');
}
