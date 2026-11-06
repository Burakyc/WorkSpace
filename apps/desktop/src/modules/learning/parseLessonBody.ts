export type LessonBlock = { kind: 'text'; text: string } | { kind: 'code'; code: string };

const isFence = (line: string) => line.trim().startsWith('```');

/**
 * Splits a part body into paragraphs (runs of non-blank lines, line breaks kept) and code blocks
 * (lines between ``` fences; an unclosed fence makes the rest code). Nothing else is interpreted.
 */
export function parseLessonBody(body: string): LessonBlock[] {
  const blocks: LessonBlock[] = [];
  let lines: string[] = [];
  let inCode = false;

  const flush = () => {
    if (inCode) blocks.push({ kind: 'code', code: lines.join('\n') });
    else if (lines.length > 0) blocks.push({ kind: 'text', text: lines.join('\n') });
    lines = [];
  };

  for (const line of body.split('\n').map((l) => l.replace(/\r$/, ''))) {
    if (isFence(line)) {
      flush();
      inCode = !inCode;
    } else if (!inCode && line.trim() === '') {
      flush();
    } else {
      lines.push(line);
    }
  }
  if (inCode || lines.length > 0) flush();
  return blocks;
}
