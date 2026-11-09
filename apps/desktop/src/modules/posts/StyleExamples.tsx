import buttons from '../../shared/ui/buttons.module.css';
import styles from './Posts.module.css';
import { STYLE_EXAMPLES } from './exampleTexts';

/** The two examples; a button puts one in the box and saves nothing. */
export function StyleExamples({ onTake }: { onTake(text: string): void }) {
  return (
    <div className={styles.examples}>
      {STYLE_EXAMPLES.map(({ language, text }) => (
        <article key={language} className={styles.card}>
          <h3 className={styles.cardTitle}>{language} örnek</h3>
          <p className={styles.text}>{text}</p>
          <div>
            <button type="button" className={buttons.secondary} onClick={() => onTake(text)}>
              {language} örneği kutuya al
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
