import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WritingRefineStructurePage from './WritingRefineStructurePage.jsx';

const { writingProgressApiMock } = vi.hoisted(() => ({
  writingProgressApiMock: {
    saveStructureProgress: vi.fn(),
  },
}));

vi.mock('../api/index.js', () => ({
  writingProgressAPI: writingProgressApiMock,
}));

vi.mock('../components/shared/ModuleAssignmentSection.jsx', () => ({
  default: () => null,
}));

vi.mock('../hooks/useScrollReveal.js', () => ({
  default: () => ({ current: null }),
}));

describe('WritingRefineStructurePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    writingProgressApiMock.saveStructureProgress.mockResolvedValue({});
  });

  it('saves structure progress only when a section is opened', async () => {
    render(<WritingRefineStructurePage user={{ id: 'student-1', role: 'student' }} hideTopBar />);

    fireEvent.click(screen.getByRole('button', { name: /议论文/ }));
    fireEvent.click(screen.getByRole('button', { name: /开头段/ }));

    expect(writingProgressApiMock.saveStructureProgress).toHaveBeenCalledWith({
      typeId: 'argumentative',
      sectionId: 'arg-intro',
    });
    expect(screen.getByText('保存中...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('已记录')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /开头段/ }));

    expect(writingProgressApiMock.saveStructureProgress).toHaveBeenCalledTimes(1);
  });
});
