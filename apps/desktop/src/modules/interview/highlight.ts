import { createHighlighterCore, type HighlighterCore } from '@shikijs/core';
import { createJavaScriptRawEngine } from '@shikijs/engine-javascript/raw';
import csharp from '@shikijs/langs-precompiled/csharp';
import githubDark from '@shikijs/themes/github-dark';
import githubLight from '@shikijs/themes/github-light';

/** One coloured piece of a line, with its colour in the light and the dark theme. */
export interface CodeToken {
  content: string;
  light?: string;
  dark?: string;
}

let highlighter: Promise<HighlighterCore> | undefined;

/**
 * C# tokens per line for both themes. The highlighter (only the C# grammar, precompiled for the JavaScript
 * regex engine) is created on the first call; a failed creation is not cached.
 */
export async function highlightCSharp(code: string): Promise<CodeToken[][]> {
  highlighter ??= createHighlighterCore({
    themes: [githubLight, githubDark],
    langs: [csharp],
    engine: createJavaScriptRawEngine(),
  }).catch((error: unknown) => {
    highlighter = undefined;
    throw error;
  });
  const lines = (await highlighter).codeToTokensWithThemes(code, {
    lang: 'csharp',
    themes: { light: 'github-light', dark: 'github-dark' },
  });
  return lines.map((line) =>
    line.map(({ content, variants }) => ({
      content,
      light: variants.light?.color,
      dark: variants.dark?.color,
    })),
  );
}
