import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import useScrollReveal from './useScrollReveal.js';

function RevealFixture() {
  const ref = useScrollReveal();

  return (
    <div ref={ref}>
      <section data-testid="hero" className="studio-reveal">Hero</section>
      <section data-testid="below-fold" className="studio-reveal">Below fold</section>
    </div>
  );
}

describe('useScrollReveal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reveals visible content before paint to avoid navigation flash', () => {
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(800);
    const observe = vi.fn();
    const unobserve = vi.fn();
    const disconnect = vi.fn();
    vi.stubGlobal('IntersectionObserver', vi.fn(function IntersectionObserverMock() {
      return { observe, unobserve, disconnect };
    }));
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function getRect() {
      if (this.textContent === 'Below fold') {
        return { top: 1200, bottom: 1300, left: 0, right: 0, width: 100, height: 100, x: 0, y: 1200, toJSON: () => ({}) };
      }
      return { top: 100, bottom: 200, left: 0, right: 0, width: 100, height: 100, x: 0, y: 100, toJSON: () => ({}) };
    });

    render(<RevealFixture />);

    expect(screen.getByTestId('hero')).toHaveClass('studio-revealed');
    expect(screen.getByTestId('below-fold')).not.toHaveClass('studio-revealed');
    expect(observe).toHaveBeenCalledWith(screen.getByTestId('below-fold'));
  });
});
