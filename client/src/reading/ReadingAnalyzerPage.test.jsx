import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReadingAnalyzerPage from './ReadingAnalyzerPage.jsx';

const { recognizeImageMock } = vi.hoisted(() => ({
  recognizeImageMock: vi.fn(),
}));

vi.mock('../api/index.js', () => ({
  readingAPI: {
    recognizeImage: recognizeImageMock,
    analyze: vi.fn().mockResolvedValue({ mindMap: { nodes: [] }, questions: [] }),
  },
}));

vi.mock('../hooks/useScrollReveal.js', () => ({
  default: () => ({ current: null }),
}));

function makeFile({ name = 'photo.jpg', type = 'image/jpeg', sizeBytes = 1024 } = {}) {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

function triggerFileInput(file) {
  const input = document.querySelector('input[type="file"]');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input, { target: { files: [file] } });
  return input;
}

describe('ReadingAnalyzerPage — OCR', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls recognizeImage and fills passage textarea on valid image upload', async () => {
    recognizeImageMock.mockResolvedValue({ text: 'The quick brown fox jumps over the lazy dog.' });
    render(<ReadingAnalyzerPage />);

    triggerFileInput(makeFile());

    await waitFor(() => {
      expect(recognizeImageMock).toHaveBeenCalledOnce();
    });

    const [passageTextarea] = screen.getAllByRole('textbox');
    await waitFor(() => {
      expect(passageTextarea.value).toContain('The quick brown fox');
    });
  });

  it('recognizes text containing question patterns and splits into passage and questions fields', async () => {
    recognizeImageMock.mockResolvedValue({
      text: 'Scientists discovered a new planet.\n\nQuestions\n1. What did scientists discover?\nA. A star  B. A planet  C. A comet  D. A moon',
    });
    render(<ReadingAnalyzerPage />);

    triggerFileInput(makeFile());

    await waitFor(() => {
      const [passageTextarea, questionsTextarea] = screen.getAllByRole('textbox');
      expect(passageTextarea.value).toContain('Scientists discovered');
      expect(questionsTextarea.value).toContain('Questions');
    });
  });

  it('shows error message when OCR returns empty text', async () => {
    recognizeImageMock.mockResolvedValue({ text: '' });
    render(<ReadingAnalyzerPage />);

    triggerFileInput(makeFile());

    await waitFor(() => {
      expect(screen.getByText(/未识别到文字/)).toBeInTheDocument();
    });
    const [passageTextarea] = screen.getAllByRole('textbox');
    expect(passageTextarea.value).toBe('');
  });

  it('shows error banner when OCR request fails, does not crash', async () => {
    recognizeImageMock.mockRejectedValue(new Error('图片识别失败，请稍后重试'));
    render(<ReadingAnalyzerPage />);

    triggerFileInput(makeFile());

    await waitFor(() => {
      expect(screen.getByText(/图片识别失败/)).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /生成思维导图/ })).toBeInTheDocument();
  });

  it('rejects unsupported file type without calling the API', async () => {
    render(<ReadingAnalyzerPage />);

    triggerFileInput(makeFile({ name: 'clip.gif', type: 'image/gif' }));

    await waitFor(() => {
      expect(screen.getByText(/仅支持 PNG、JPG\/JPEG、WEBP 图片/)).toBeInTheDocument();
    });
    expect(recognizeImageMock).not.toHaveBeenCalled();
  });

  it('rejects files exceeding the size limit without calling the API', async () => {
    render(<ReadingAnalyzerPage />);

    triggerFileInput(makeFile({ sizeBytes: 11 * 1024 * 1024 }));

    await waitFor(() => {
      expect(screen.getByText(/10MB/)).toBeInTheDocument();
    });
    expect(recognizeImageMock).not.toHaveBeenCalled();
  });
});
