import { describe, expect, it } from 'vitest';
import { isAllowedExternalUrl, isAllowedNavigation } from './navigation';

const devUrl = 'http://localhost:5173/';
const fileUrl = 'file:///C:/Program%20Files/DevPath/resources/app/out/renderer/index.html';

describe('isAllowedNavigation', () => {
  it.each([
    ['http://localhost:5173/', devUrl],
    ['http://localhost:5173/notes', devUrl],
    ['http://localhost:5173/#/goals', devUrl],
    [fileUrl, fileUrl],
    [`${fileUrl}#/goals`, fileUrl],
  ])('allows the app page %s', (target, app) => {
    expect(isAllowedNavigation(target, app)).toBe(true);
  });

  it.each([
    ['https://example.com', devUrl],
    ['http://127.0.0.1:5180/api/health', devUrl],
    ['http://localhost:5174/', devUrl],
    ['javascript:alert(1)', devUrl],
    ['file:///C:/Windows/System32/drivers/etc/hosts', fileUrl],
    ['https://example.com', fileUrl],
    ['javascript:alert(1)', fileUrl],
  ])('blocks %s', (target, app) => {
    expect(isAllowedNavigation(target, app)).toBe(false);
  });

  it.each(['', 'not a url'])('blocks the invalid URL %j', (target) => {
    expect(isAllowedNavigation(target, devUrl)).toBe(false);
  });
});

describe('isAllowedExternalUrl', () => {
  it('allows https links', () => {
    expect(isAllowedExternalUrl('https://github.com/x')).toBe(true);
  });

  it.each([
    'http://github.com/x',
    'file:///C:/Windows',
    'javascript:alert(1)',
    'mailto:me@example.com',
    '',
    'not a url',
  ])('refuses %s', (url) => {
    expect(isAllowedExternalUrl(url)).toBe(false);
  });
});
