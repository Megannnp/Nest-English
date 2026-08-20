import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import FeedbackView from './index.jsx';

const { buildFeedbackPdfHtmlMock } = vi.hoisted(() => ({
  buildFeedbackPdfHtmlMock: vi.fn(() => '<html><body>pdf</body></html>'),
}));

vi.mock('../../hooks/useIsMobile.js', () => ({
  default: () => false,
}));

vi.mock('./feedbackPrint', () => ({
  buildFeedbackPdfHtml: buildFeedbackPdfHtmlMock,
}));

vi.mock('./FeedbackOverview', () => ({
  default: ({ onExportPDF }) => (
    <div>
      <div>overview-panel</div>
      <button type="button" onClick={onExportPDF}>mock-export</button>
    </div>
  ),
}));

vi.mock('./FeedbackAIEvaluation', () => ({
  FeedbackAIEvaluation: ({ feedback }) => (
    <div>
      evaluation-mode
      <span>{feedback?.summary || 'no-summary'}</span>
    </div>
  ),
  FeedbackAnalysisPanel: ({ feedback }) => (
    <div>
      analysis-mode
      <span>{feedback?.overview || feedback?.reason || 'no-overview'}</span>
    </div>
  ),
}));

describe('FeedbackView high-value behavior', () => {
  it('shows inline message when export popup is blocked', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

    render(
      <FeedbackView
        feedback={{
          totalScore: 10,
          maxScore: 15,
          summary: '有一定基础。',
          questionAnalysis: { type: 'general' },
        }}
      />
    );

    fireEvent.click(await screen.findByText('mock-export'));

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalled();
      expect(screen.getByText('请在浏览器中允许弹出窗口，然后再试一次。')).toBeInTheDocument();
    });
  });

  it('renders partial feedback safely when only analysis overview exists', async () => {
    render(
      <FeedbackView
        feedback={{
          questionAnalysis: {
            type: 'general',
            overview: '题目分析已生成核心概览。',
          },
        }}
      />
    );

    fireEvent.click(screen.getByText('题目分析'));

    await waitFor(() => {
      expect(screen.getByText('analysis-mode')).toBeInTheDocument();
      expect(screen.getByText('题目分析已生成核心概览。')).toBeInTheDocument();
    });
  });

  it('shows supplemental generation status in the evaluation tab', async () => {
    render(
      <FeedbackView
        feedback={{
          totalScore: 10,
          maxScore: 15,
          summary: '基础反馈可查看。',
          analysisMeta: { supplementalStatus: 'running' },
          questionAnalysis: { type: 'general' },
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('完整精批补充中')).toBeInTheDocument();
      expect(screen.getByText('基础反馈已经可以查看，范文、语言细节和高阶建议仍在继续生成。')).toBeInTheDocument();
    });
  });

  it('shows question analysis generation status in the analysis tab', async () => {
    render(
      <FeedbackView
        feedback={{
          summary: '基础反馈可查看。',
          analysisMeta: { status: 'pending' },
          questionAnalysis: {
            type: 'general',
            overview: '题目分析生成中，请稍候查看。',
          },
        }}
      />
    );

    fireEvent.click(screen.getByText('题目分析'));

    await waitFor(() => {
      expect(screen.getByText('题目分析仍在补充中')).toBeInTheDocument();
      expect(screen.getAllByText('题目分析生成中，请稍候查看。').length).toBeGreaterThan(0);
    });
  });

  it('exports pdf with adapted payload when popup opens successfully', async () => {
    const writeMock = vi.fn();
    const closeMock = vi.fn();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({
      document: {
        write: writeMock,
        close: closeMock,
      },
    });

    render(
      <FeedbackView
        feedback={{
          totalScore: 13,
          maxScore: 15,
          summary: '整体表现不错。',
          questionAnalysis: {
            type: 'continuation',
            overview: '续写主线清晰。',
          },
        }}
        question={{
          title: 'Continuation prompt',
          promptText: 'Read the story and continue.',
          type: 'continuation',
        }}
        studentName="Amy"
        user={{ realName: '王老师' }}
        teacherComment="继续保持"
      />
    );

    fireEvent.click(await screen.findByText('mock-export'));

    await waitFor(() => {
      expect(buildFeedbackPdfHtmlMock).toHaveBeenCalled();
      expect(openSpy).toHaveBeenCalled();
      expect(writeMock).toHaveBeenCalledWith('<html><body>pdf</body></html>');
      expect(closeMock).toHaveBeenCalled();
    });
  });
});
