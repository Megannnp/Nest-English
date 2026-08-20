import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WritingPage from './WritingPage.jsx';

const { modelMock, setImageMock, setImagesMock } = vi.hoisted(() => ({
  modelMock: vi.fn(),
  setImageMock: vi.fn(),
  setImagesMock: vi.fn(),
}));

vi.mock('./core/useWritingPageModel.jsx', () => ({
  useWritingPageModel: modelMock,
}));

vi.mock('./WritingTopBar.jsx', () => ({
  default: () => null,
}));

vi.mock('../components/shared/PageHero.jsx', () => ({
  default: () => null,
}));

vi.mock('../components/shared/CropModal.jsx', () => ({
  default: () => null,
}));

vi.mock('../hooks/useScrollReveal.js', () => ({
  default: () => ({ current: null }),
}));

vi.mock('./core/WritingSourceSection.jsx', () => ({
  default: () => <div data-testid="source-section" />,
}));

vi.mock('./core/FeedbackResultSection.jsx', () => ({
  default: () => null,
}));

vi.mock('./core/TeacherSubstitutePanel.jsx', () => ({
  default: () => null,
}));

vi.mock('./core/WritingEditorPanel.jsx', () => ({
  default: ({ images, onRemoveImage }) => (
    <div data-testid="editor-panel">
      {images.map((item, index) => (
        <button key={item.name} type="button" onClick={() => onRemoveImage(index)}>
          删除 {item.name}
        </button>
      ))}
    </div>
  ),
}));

function createModel() {
  const firstImage = { name: 'first.png', mediaType: 'image/png', base64: 'Zmlyc3Q=' };
  const secondImage = { name: 'second.png', mediaType: 'image/png', base64: 'c2Vjb25k' };
  return {
    state: {
      feedback: null,
      loading: false,
      error: '',
      voiceSupported: false,
      voiceListeningTarget: '',
      voiceStatusByTarget: { prompt: {}, writing: {} },
      voiceSessionStateByTarget: { prompt: 'idle', writing: 'idle' },
      currentTaskContext: null,
      isTaskMode: false,
      words: 0,
      draftState: {
        text: '',
        image: secondImage,
        images: [firstImage, secondImage],
        lightboxImg: null,
        isRecognizingPrompt: false,
        isRecognizingWriting: false,
        promptText: '',
        writingTitle: '',
        selectedQId: '',
        maxOpt: '15',
        customMax: '',
        assignOpen: false,
        aiAnalysis: null,
        isRecognizingTags: false,
        manualType: '',
        showManualCorrect: false,
        classes: [],
        subUploadOpen: false,
        selectedClass: '',
        selectedStudent: '',
        studentsInClass: [],
      },
    },
    actions: {
      setFeedback: vi.fn(),
      setStreamText: vi.fn(),
      setError: vi.fn(),
      toggleVoiceInput: vi.fn(),
      restartVoiceInput: vi.fn(),
      finishVoiceInput: vi.fn(),
      handlePromptPaste: vi.fn(),
      handleWritingPaste: vi.fn(),
      handleWritingImage: vi.fn(),
      uploadPromptImages: vi.fn(),
      handlePromptKeyDown: vi.fn(),
      submitWriting: vi.fn(),
      setImage: setImageMock,
      setImages: setImagesMock,
      setLightboxImg: vi.fn(),
      setText: vi.fn(),
      setPromptText: vi.fn(),
      setWritingTitle: vi.fn(),
      setIsRecognizingPrompt: vi.fn(),
      setIsRecognizingWriting: vi.fn(),
      setAiAnalysis: vi.fn(),
      setAssignOpen: vi.fn(),
      setCustomMax: vi.fn(),
      setManualType: vi.fn(),
      setMaxOpt: vi.fn(),
      setShowManualCorrect: vi.fn(),
      setSelectedClass: vi.fn(),
      setSelectedStudent: vi.fn(),
      setSubUploadOpen: vi.fn(),
      handleSelectQ: vi.fn(),
      setVersionOfWritingId: vi.fn(),
    },
  };
}

describe('WritingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modelMock.mockReturnValue(createModel());
  });

  it('keeps the submitted main image in sync when a writing image is removed', async () => {
    render(<WritingPage user={{ id: 'student-1' }} questions={[]} hideTopBar />);

    fireEvent.click(await screen.findByRole('button', { name: '删除 second.png' }));

    await waitFor(() => {
      expect(setImagesMock).toHaveBeenCalledWith(expect.any(Function));
    });
    const updater = setImagesMock.mock.calls[0][0];
    const nextImages = updater(createModel().state.draftState.images);

    expect(nextImages).toEqual([
      { name: 'first.png', mediaType: 'image/png', base64: 'Zmlyc3Q=' },
    ]);
    expect(setImageMock).toHaveBeenCalledWith({
      name: 'first.png',
      mediaType: 'image/png',
      base64: 'Zmlyc3Q=',
    });
  });
});
