import { describe, expect, it } from 'vitest';
import css from './tokens.css?raw';

/** The `--color-*: #rrggbb` values of one CSS block. */
function colors(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1]!, m[2]!]),
  );
}

const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
const light = colors(css.slice(0, darkStart));
const themes = { light, dark: { ...light, ...colors(css.slice(darkStart)) } };

/** WCAG 2.1 relative luminance and contrast ratio. */
function luminance(hex: string): number {
  const [r = 0, g = 0, b = 0] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const backgrounds = ['bg', 'surface', 'surface-hover'];
// [foreground, background, minimum ratio]: AA normal text 4.5, UI parts (focus ring, field borders) 3.
const pairs: [string, string, number][] = [
  ...backgrounds.flatMap((bg): [string, string, number][] => [
    ['text', bg, 4.5],
    ['text-muted', bg, 4.5],
  ]),
  ['accent-text', 'accent', 4.5],
  ['accent-soft-text', 'accent-soft', 4.5],
  ['danger', 'surface', 4.5],
  ['danger', 'bg', 4.5],
  ['success', 'surface', 4.5],
  ['focus', 'surface', 3],
  ['focus', 'bg', 3],
  ['input-border', 'surface', 3],
  ['input-border', 'bg', 3],
];

describe.each(Object.entries(themes))('%s theme', (_name, theme) => {
  it.each(pairs)('%s on %s is at least %s:1', (fg, bg, min) => {
    expect(theme[fg], fg).toBeDefined();
    expect(theme[bg], bg).toBeDefined();
    expect(contrast(theme[fg]!, theme[bg]!)).toBeGreaterThanOrEqual(min);
  });
});
