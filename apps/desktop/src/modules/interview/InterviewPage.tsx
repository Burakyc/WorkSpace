import { MessagesSquare } from 'lucide-react';
import { TopicListPage } from '../content/TopicListPage';
import { interviewCounts } from './interviewCounts';

/** The interview topics. */
export function InterviewPage() {
  return (
    <TopicListPage
      type="interview"
      basePath="/interview"
      icon={MessagesSquare}
      title="Mülakat"
      description="Mülakat soruların ve cevapların kart olarak burada olacak."
      counts={interviewCounts}
    />
  );
}
