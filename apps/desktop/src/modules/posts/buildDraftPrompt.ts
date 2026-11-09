/**
 * A post template with its placeholders filled in one pass, so text inside a value is never read as a placeholder.
 * Line ends are LF whatever the checkout has, so what is copied matches what the box shows.
 */
export function buildDraftPrompt(
  template: string,
  values: { topic: string; style: string; source: string },
): string {
  const filled = { ...values, style: values.style === '' ? '(none)' : values.style };
  return template
    .replace(/\r\n/g, '\n')
    .replace(/\{\{(topic|style|source)\}\}/g, (_, name: keyof typeof filled) => filled[name]);
}
