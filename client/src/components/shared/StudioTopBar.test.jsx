import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import StudioTopBar from './StudioTopBar.jsx';

const { preloadPageMock } = vi.hoisted(() => ({
  preloadPageMock: vi.fn(),
}));

vi.mock('../../app/pagePreloaders.js', () => ({
  preloadPage: preloadPageMock,
}));

describe('StudioTopBar', () => {
  it('preloads direct nav targets on hover', () => {
    render(
      <StudioTopBar
        logoSrc="/logo.svg"
        logoAlt="nest"
        logoLabel="筑巢语法"
        navItems={[
          { id: 'grammar-analyzer', label: '分析句子', onClick: vi.fn() },
        ]}
      />
    );

    fireEvent.pointerEnter(screen.getByRole('button', { name: '分析句子' }));

    expect(preloadPageMock).toHaveBeenCalledWith('grammar-analyzer');
  });

  it('preloads product switch targets on focus', () => {
    render(
      <StudioTopBar
        logoSrc="/logo.svg"
        logoAlt="nest"
        logoLabel="筑巢语法"
        switchTo={[
          { label: '筑巢写作', preloadPage: 'writing-refine-sentence', onClick: vi.fn() },
        ]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '切换筑巢产品' }));
    fireEvent.focus(screen.getByRole('menuitem', { name: '筑巢写作' }));

    expect(preloadPageMock).toHaveBeenCalledWith('writing-refine-sentence');
  });
});
