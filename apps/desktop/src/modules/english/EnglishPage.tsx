import { Languages } from 'lucide-react';
import { TopicListPage } from '../content/TopicListPage';
import { vocabCounts } from './vocabCounts';

/** The vocabulary topics. */
export function EnglishPage() {
  return (
    <TopicListPage
      type="vocab"
      basePath="/english"
      icon={Languages}
      title="İngilizce"
      description="Kendi eklediğin kelime ve ifade kartları burada olacak."
      counts={vocabCounts}
    />
  );
}
