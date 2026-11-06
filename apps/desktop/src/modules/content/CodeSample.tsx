import { useEffect, useState, type CSSProperties } from 'react';
import { highlightCSharp, type CodeToken } from './highlight';
import styles from './CodeSample.module.css';

/** A C# sample: plain text at once, coloured once the highlighter is ready (plain text stays if it fails). */
export function CodeSample({ code }: { code: string }) {
  const [lines, setLines] = useState<CodeToken[][] | null>(null);

  useEffect(() => {
    let active = true;
    highlightCSharp(code).then(
      (tokens) => {
        if (active) setLines(tokens);
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [code]);

  return (
    <pre className={styles.code}>
      <code>
        {lines
          ? lines.map((line, i) => (
              <span key={i}>
                {line.map((token, j) => (
                  <span
                    key={j}
                    style={
                      { '--shiki-light': token.light, '--shiki-dark': token.dark } as CSSProperties
                    }
                  >
                    {token.content}
                  </span>
                ))}
                {i < lines.length - 1 && '\n'}
              </span>
            ))
          : code}
      </code>
    </pre>
  );
}
