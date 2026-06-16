import { describe, it, expect } from 'vitest';
import { appendDictation } from '../appendDictation';

describe('appendDictation', () => {
  it('returns the addition when existing is empty', () => {
    expect(appendDictation('', 'Smoke detector present.')).toBe('Smoke detector present.');
    expect(appendDictation('   ', 'Hello.')).toBe('Hello.');
  });

  it('returns existing unchanged when addition is blank', () => {
    expect(appendDictation('Walls are clean.', '')).toBe('Walls are clean.');
    expect(appendDictation('Walls are clean.', '   ')).toBe('Walls are clean.');
  });

  it('joins existing and addition with a single space', () => {
    expect(appendDictation('Walls are clean.', 'No cracks.')).toBe(
      'Walls are clean. No cracks.',
    );
  });

  it('does not double spaces when existing has trailing whitespace', () => {
    expect(appendDictation('Walls are clean. ', 'No cracks.')).toBe(
      'Walls are clean. No cracks.',
    );
  });

  it('trims leading/trailing whitespace on the addition', () => {
    expect(appendDictation('A.', '  B.  ')).toBe('A. B.');
  });
});
