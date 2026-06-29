import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QuestionRow } from '../StepGroup';
import { makeQuestion } from './_fixtures';

const tags = makeQuestion({
  slug: 'fv_neighbourhood_vibe_tags',
  label: 'Neighbourhood vibe',
  type: 'select',
  multi_select: true,
  options: ['Lively', 'Quiet', 'Residential', 'Touristy'],
});

function renderRow(extra: Record<string, unknown> = {}) {
  const onChange = vi.fn();
  render(
    <QuestionRow
      question={tags}
      inspectionId="i1"
      targetId="t1"
      areaKey="2"
      stepIndex={null}
      hubValue={undefined}
      answers={{}}
      onChange={onChange}
      setNotes={() => {}}
      {...extra}
    />,
  );
  return onChange;
}

describe('QuestionRow — multi-select prefill', () => {
  it('shows a Pre-filled Accept banner when a hub/voice array suggestion exists', () => {
    renderRow({ hubValue: ['Quiet', 'Residential'] });
    expect(screen.getByText(/Pre-filled/i)).toBeInTheDocument();
    expect(screen.getByText('Quiet, Residential')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Accept/i })).toBeInTheDocument();
  });

  it('Accept applies the suggested array with wasAcceptedAsIs=true', async () => {
    const onChange = renderRow({ hubValue: ['Quiet', 'Residential'] });
    await userEvent.click(screen.getByRole('button', { name: /Accept/i }));
    expect(onChange).toHaveBeenCalledWith(
      tags,
      { value: ['Quiet', 'Residential'], wasAcceptedAsIs: true },
      null,
    );
  });

  it('hides the banner once the field already has a selection', () => {
    renderRow({
      hubValue: ['Quiet'],
      answers: {
        't1::2::fv_neighbourhood_vibe_tags': {
          id: 'a', inspection_id: 'i1', target_id: 't1', scope: 'location',
          question_key: 'fv_neighbourhood_vibe_tags', area_key: '2', step_index: null,
          value: ['Lively'], was_prefilled: false, was_accepted_as_is: false,
          created_at: 'n', updated_at: 'n',
        },
      },
    });
    expect(screen.queryByText(/Pre-filled/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Accept/i })).not.toBeInTheDocument();
  });

  it('shows no banner when there is no suggestion', () => {
    renderRow();
    expect(screen.queryByText(/Pre-filled/i)).not.toBeInTheDocument();
  });
});
