import { describe, expect, it } from 'vitest';
import type { InterviewItem } from '../../shared/api/types';
import { ALL_QUESTIONS, filterQuestions, questionTags } from './filterQuestions';

const q = (
  id: string,
  difficulty: InterviewItem['difficulty'],
  tags?: string[],
  practised = false,
): InterviewItem => ({
  id,
  addedAt: '2026-11-06T09:00:00Z',
  question: id,
  answer: 'a',
  difficulty,
  ...(tags ? { tags } : {}),
  ...(practised ? { mark: 'practised' as const } : {}),
});

const items = [
  q('a', 'easy', ['di']),
  q('b', 'hard', ['di', 'ef'], true),
  q('c', 'hard'),
  q('d', 'medium', ['ef']),
];
const ids = (list: InterviewItem[]) => list.map((item) => item.id);

describe('filterQuestions', () => {
  it('keeps everything without a filter', () => {
    expect(ids(filterQuestions(items, ALL_QUESTIONS))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('filters by difficulty, tag and state alone', () => {
    expect(ids(filterQuestions(items, { ...ALL_QUESTIONS, difficulty: 'hard' }))).toEqual([
      'b',
      'c',
    ]);
    expect(ids(filterQuestions(items, { ...ALL_QUESTIONS, tag: 'ef' }))).toEqual(['b', 'd']);
    expect(ids(filterQuestions(items, { ...ALL_QUESTIONS, status: 'practised' }))).toEqual(['b']);
    expect(ids(filterQuestions(items, { ...ALL_QUESTIONS, status: 'open' }))).toEqual([
      'a',
      'c',
      'd',
    ]);
  });

  it('combines the filters', () => {
    expect(ids(filterQuestions(items, { difficulty: 'hard', tag: 'di', status: 'open' }))).toEqual(
      [],
    );
    expect(ids(filterQuestions(items, { difficulty: 'hard', tag: 'di', status: 'all' }))).toEqual([
      'b',
    ]);
  });

  it('lists the question tags once, sorted', () => {
    expect(questionTags(items)).toEqual(['di', 'ef']);
  });
});
