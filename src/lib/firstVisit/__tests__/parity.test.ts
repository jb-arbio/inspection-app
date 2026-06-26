import { describe, it, expect } from 'vitest';
import { ALL_QUESTIONS } from '../questions';
import snapshot from './__fixtures__/all-questions.snapshot.json';

describe('survey config parity', () => {
  it('ALL_QUESTIONS is byte-identical to the captured snapshot', () => {
    expect(JSON.parse(JSON.stringify(ALL_QUESTIONS))).toEqual(snapshot);
  });
});
