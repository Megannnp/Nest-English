import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import NavDropdown from './NavDropdown.jsx';

const { preloadPageMock } = vi.hoisted(() => ({
  preloadPageMock: vi.fn(),
}));

vi.mock('../../app/pagePreloaders.js', () => ({
  preloadPage: preloadPageMock,
}));

describe('NavDropdown', () => {
  it('preloads dropdown targets before navigation', () => {
    render(
      <NavDropdown
        label="语法练习"
        items={[
          { id: 'grammar-quiz', label: '在线练习', onClick: vi.fn() },
          { id: 'grammar-practice', label: '题卷生成', onClick: vi.fn() },
        ]}
      />
    );

    fireEvent.pointerEnter(screen.getByRole('button', { name: '语法练习' }));

    expect(preloadPageMock).toHaveBeenCalledWith('grammar-quiz');
    expect(preloadPageMock).toHaveBeenCalledWith('grammar-practice');
  });
});
