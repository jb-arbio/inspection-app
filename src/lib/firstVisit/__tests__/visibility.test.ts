import { describe, it, expect } from 'vitest';
import { isVisible, type VisibleWhen } from '@/lib/firstVisit/questions';

const A = (entries: Record<string, unknown>) => new Map(Object.entries(entries));

describe('isVisible', () => {
  it('shows a question with no visible_when rule', () => {
    expect(isVisible(undefined, A({}))).toBe(true);
  });
  it('equals: hidden until controlling answer matches', () => {
    const rule: VisibleWhen = { question: 'fv_parking_available', equals: 'Yes' };
    expect(isVisible(rule, A({ fv_parking_available: 'No' }))).toBe(false);
    expect(isVisible(rule, A({ fv_parking_available: 'Yes' }))).toBe(true);
    expect(isVisible(rule, A({}))).toBe(false); // unanswered controller → hidden
  });
  it('not_equals: hidden only when controller equals the excluded value', () => {
    const rule: VisibleWhen = { question: 'fv_elevator', not_equals: 'No elevator' };
    expect(isVisible(rule, A({ fv_elevator: 'No elevator' }))).toBe(false);
    expect(isVisible(rule, A({ fv_elevator: 'Working' }))).toBe(true);
    expect(isVisible(rule, A({}))).toBe(true); // unanswered → not excluded → visible
  });
  it('in / not_in lists', () => {
    expect(isVisible({ question: 'q', in: ['a', 'b'] }, A({ q: 'b' }))).toBe(true);
    expect(isVisible({ question: 'q', in: ['a', 'b'] }, A({ q: 'c' }))).toBe(false);
    expect(isVisible({ question: 'q', not_in: ['x'] }, A({ q: 'x' }))).toBe(false);
  });
  it('boolean controllers compare strictly', () => {
    expect(isVisible({ question: 'q', equals: false }, A({ q: false }))).toBe(true);
    expect(isVisible({ question: 'q', equals: false }, A({ q: true }))).toBe(false);
  });
  it('multi-select controller: in/equals match if any selected option matches', () => {
    expect(isVisible({ question: 'q', in: ['Pool'] }, A({ q: ['Garden', 'Pool'] }))).toBe(true);
    expect(isVisible({ question: 'q', equals: 'None' }, A({ q: ['None'] }))).toBe(true);
  });
});
