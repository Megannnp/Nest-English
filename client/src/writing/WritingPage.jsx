// src/components/WritingPage.jsx
import { useWritingPageModel } from './core/useWritingPageModel.jsx';
import {
  STYLE_TAG,
  buildHeroModel,
  hasTaskSubmission,
} from './WritingPageSupport.jsx';
import WritingTopBar from "./WritingTopBar.jsx";
import WritingWorkspace from './WritingWorkspace.jsx';
import PageHero from '../components/shared/PageHero.jsx';
import useScrollReveal from '../hooks/useScrollReveal.js';
import './writing.css';

export default function WritingPage({
  user,
  questions,
  serviceError = "",
  onQuestionsChange,
  onWritingSaved,
  taskContext = null,
  preloadedQuestion,
  savedFeedback,
  onFeedbackChange,
  _sidebarWidth = 58,
  isMobile = false,
  initialDraft = null,
  draftHydrationKey,
  onDraftChange,
  guestMode = false,
  guestSourceMode = '',
  writingSourceMode = '',
  onRequireAuth,
  onNavigate,
  activePage = 'writing',
  onAccountClick,
  enableSubstituteUpload = false,
  hideTopBar = false,
}) {
  const pageRef = useScrollReveal();
  const {
    state: {
      feedback,
      loading,
      error,
      _streamText,
      voiceSupported,
      voiceListeningTarget,
      voiceStatusByTarget,
      voiceSessionStateByTarget,
      draftState,
      currentTaskContext,
      isTaskMode,
      words,
      _max,
      _visibleSourceTag,
    },
    actions,
  } = useWritingPageModel({
    user,
    questions,
    preloadedQuestion,
    taskContext,
    initialDraft,
    draftHydrationKey,
    savedFeedback,
    onDraftChange,
    guestMode,
    onFeedbackChange,
    onQuestionsChange,
    onWritingSaved,
    onRequireAuth,
  });
  const {
    toggleVoiceInput,
    restartVoiceInput,
    finishVoiceInput,
    handlePromptPaste,
    handleWritingPaste,
    handleWritingImage,
    uploadPromptImages,
    handlePromptKeyDown,
    submitWriting,
    ...draftActions
  } = actions;
  const { scoreMismatchHint } = draftState;
  const { handleSelectQ } = draftActions;

  const heroModel = buildHeroModel({
    enableSubstituteUpload,
    guestSourceMode,
    writingSourceMode,
    isTaskMode,
  });
  const hasSubmittedTask = hasTaskSubmission({ currentTaskContext, feedback });

  return (
    <div className={`writing-studio-shell${guestMode ? ' writing-studio-shell--guest' : ''}`} ref={pageRef}>
      <style>{STYLE_TAG}</style>
      {!hideTopBar && (
        <WritingTopBar
          user={user}
          onNavigate={onNavigate}
          onAccountClick={onAccountClick}
          onLogin={() => onRequireAuth?.({ mode: 'login' })}
          onRegister={() => onRequireAuth?.({ mode: 'register' })}
          activePage={activePage}
        />
      )}

      <div className="gm-analyzer-page writing-studio-inner">
        <PageHero eyebrow={heroModel.kicker} title={heroModel.title} description={heroModel.subtitle} />
        <WritingWorkspace
          actions={actions}
          currentTaskContext={currentTaskContext}
          draftActions={draftActions}
          draftState={draftState}
          enableSubstituteUpload={enableSubstituteUpload}
          error={error}
          feedback={feedback}
          finishVoiceInput={finishVoiceInput}
          guestMode={guestMode}
          guestSourceMode={guestSourceMode}
          hasSubmittedTask={hasSubmittedTask}
          handlePromptKeyDown={handlePromptKeyDown}
          handlePromptPaste={handlePromptPaste}
          handleSelectQ={handleSelectQ}
          handleWritingImage={handleWritingImage}
          handleWritingPaste={handleWritingPaste}
          isMobile={isMobile}
          isTaskMode={isTaskMode}
          loading={loading}
          onNavigate={onNavigate}
          questions={questions}
          restartVoiceInput={restartVoiceInput}
          scoreMismatchHint={scoreMismatchHint}
          serviceError={serviceError}
          submitWriting={submitWriting}
          toggleVoiceInput={toggleVoiceInput}
          uploadPromptImages={uploadPromptImages}
          user={user}
          voiceListeningTarget={voiceListeningTarget}
          voiceSessionStateByTarget={voiceSessionStateByTarget}
          voiceStatusByTarget={voiceStatusByTarget}
          voiceSupported={voiceSupported}
          words={words}
          writingSourceMode={writingSourceMode}
        />
      </div>
    </div>
  );
}
