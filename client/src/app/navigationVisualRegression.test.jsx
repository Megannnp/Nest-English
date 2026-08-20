import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import AppLoadingShell from '../components/shared/AppLoadingShell.jsx';

const indexCss = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

describe('navigation visual regression contracts', () => {
  it('uses a visible loading shell so navigation does not look stuck', () => {
    const { container } = render(<AppLoadingShell />);

    expect(screen.getByRole('status')).toHaveTextContent('正在加载');
    expect(container.querySelector('.app-loading-shell__spinner')).toBeInTheDocument();
  });

  it('centralizes page backgrounds through site theme variables', () => {
    expect(indexCss).toContain('--site-page-background');
    expect(indexCss).toContain('--portal-page-background');
    expect(indexCss).toContain('--grammar-page-background');
    expect(indexCss).toContain('--reading-page-background');
    expect(indexCss).toContain('--writing-page-background');
    expect(indexCss).toContain('background: var(--site-page-background)');
  });

  it('disables reveal transitions while navigation is pending', () => {
    expect(indexCss).toContain('body[data-navigation-pending="true"] .studio-reveal');
    expect(indexCss).toContain('transition: none');
  });
});
