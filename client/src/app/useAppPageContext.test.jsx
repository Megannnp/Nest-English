import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import useAppPageContext from './useAppPageContext.jsx';

function Harness({ navigation }) {
  const context = useAppPageContext({
    route: {},
    state: {
      questions: [],
      myWritings: [],
      preloadedQ: null,
      writingFeedback: null,
      currentTask: null,
      guestWritingDraft: null,
      studentWritingSessionKey: 'student-session',
    },
    actions: {
      handleQuestionsChange: vi.fn(),
      handleWritingSaved: vi.fn(),
      setCurrentTask: vi.fn(),
      setWritingFeedback: vi.fn(),
      setGuestWritingDraft: vi.fn(),
      resetStudentWritingSession: vi.fn(),
      setUser: vi.fn(),
    },
    navigation,
  });

  return (
    <button
      type="button"
      onClick={() => context.studentPage.actions.openTask({
        id: 'module-task-1',
        taskType: 'module',
        assignment: { entryPage: 'reading-practice' },
      })}
    >
      open
    </button>
  );
}

describe('useAppPageContext', () => {
  it('stores module task context before opening the module entry page', () => {
    window.sessionStorage.clear();
    const navigation = { setPage: vi.fn(), openStudentRecord: vi.fn() };

    render(<Harness navigation={navigation} />);
    screen.getByRole('button', { name: 'open' }).click();

    expect(navigation.setPage).toHaveBeenCalledWith('reading-practice');
    expect(JSON.parse(window.sessionStorage.getItem('nest_module_task_context'))).toMatchObject({
      id: 'module-task-1',
      taskType: 'module',
    });
  });
});
