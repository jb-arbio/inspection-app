import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { PrefilledField } from '../PrefilledField';
import { makeQuestion } from './_fixtures';

describe('PrefilledField — date autofill on mount', () => {
  const dateQ = makeQuestion({
    slug: 'visit_date',
    label: 'Visit date',
    type: 'date',
  });

  it('fires onChange exactly once with todays ISO date when value is empty', () => {
    const onChange = vi.fn();
    render(
      <PrefilledField
        question={dateQ}
        hubValue={undefined}
        value=""
        onChange={onChange}
      />,
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    const call = onChange.mock.calls[0][0];
    expect(call.wasAcceptedAsIs).toBe(false);
    // ISO date format YYYY-MM-DD, matches today (UTC slice).
    expect(call.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(call.value).toBe(new Date().toISOString().slice(0, 10));
  });

  it('does NOT autofill when value is already set', () => {
    const onChange = vi.fn();
    render(
      <PrefilledField
        question={dateQ}
        hubValue={undefined}
        value="2024-01-15"
        onChange={onChange}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does NOT autofill for non-date question types', () => {
    const onChange = vi.fn();
    render(
      <PrefilledField
        question={makeQuestion({ slug: 'x', label: 'X', type: 'text' })}
        hubValue={undefined}
        value=""
        onChange={onChange}
      />,
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not re-fire the autofill on re-render with the value now set', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <PrefilledField
        question={dateQ}
        hubValue={undefined}
        value=""
        onChange={onChange}
      />,
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    const today = new Date().toISOString().slice(0, 10);
    rerender(
      <PrefilledField
        question={dateQ}
        hubValue={undefined}
        value={today}
        onChange={onChange}
      />,
    );
    rerender(
      <PrefilledField
        question={dateQ}
        hubValue={undefined}
        value={today}
        onChange={onChange}
      />,
    );
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
