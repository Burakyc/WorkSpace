import { CodeSample } from '../content/CodeSample';
import styles from './Learning.module.css';
import { parseLessonBody } from './parseLessonBody';

/** A part body as paragraphs and C# code samples; text is never interpreted as HTML. */
export function LessonBody({ body }: { body: string }) {
  return (
    <div className={styles.body}>
      {parseLessonBody(body).map((block, index) =>
        block.kind === 'code' ? (
          <CodeSample key={index} code={block.code} />
        ) : (
          <p key={index}>{block.text}</p>
        ),
      )}
    </div>
  );
}
