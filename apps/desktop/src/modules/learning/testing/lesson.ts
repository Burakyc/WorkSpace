import { fakeTopic } from '../../content/testing/fakeContentApi';

/** A three-part lesson; the first part is done, the second has code and exercises. */
export const diLesson = fakeTopic(
  { type: 'lesson', slug: 'di', topic: 'Dependency injection', level: 'beginner', tags: ['di'] },
  [
    {
      title: 'Why DI',
      summary: 'The problem.',
      body: 'Classes create what they need.',
      mark: 'done',
    },
    {
      title: 'Lifetimes',
      summary: 'Scoped, transient, singleton.',
      body: 'Three lifetimes exist.\nEach has a use.\n\n```csharp\nservices.AddScoped<IClock, Clock>();\n```\n\nChoose carefully.',
      exercises: ['Register a scoped service.', 'Inject it into a controller.'],
    },
    { title: 'Testing', summary: 'Fakes.', body: 'Use fakes.' },
  ],
);
