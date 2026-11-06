import { GraduationCap } from 'lucide-react';
import { TopicListPage } from '../content/TopicListPage';
import { lessonCounts } from './lessonCounts';

/** The lessons. */
export function LearningPage() {
  return (
    <TopicListPage
      type="lesson"
      basePath="/learning"
      icon={GraduationCap}
      title="Öğrenme"
      description="Konulara ve parçalara bölünmüş derslerin burada olacak."
      counts={lessonCounts}
    />
  );
}
