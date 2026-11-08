import interview from '../../../../../prompts/interview.md?raw';
import lesson from '../../../../../prompts/lesson.md?raw';
import lessonPlan from '../../../../../prompts/lesson-plan.md?raw';
import vocab from '../../../../../prompts/vocab.md?raw';
import type { ContentType } from '../../shared/api/types';

/** The prompt templates of the repo's prompts/ folder, bundled at build time. */
export const promptTemplates: Readonly<Record<ContentType, string>> = { vocab, lesson, interview };

/** The AI teacher's template; `buildLessonPlanPrompt` fills it in. */
export const lessonPlanTemplate = lessonPlan;
