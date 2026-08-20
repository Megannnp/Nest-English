import { Suspense, lazy, useState } from 'react';

import { validateImageFile } from './core/useImageRecognition.js';
import {
  WritingPanelFallback,
} from './WritingPageSupport.jsx';
import {
  SubstituteUploadSection,
  WritingEditorSection,
  WritingSourcePanel,
} from './WritingWorkspaceSections.jsx';
import CropModal from '../components/shared/CropModal.jsx';
import { StatusBanner } from '../components/shared/UI.jsx';

const FeedbackResultSection = lazy(() => import('./core/FeedbackResultSection.jsx'));

function submitButtonText({ guestMode, isTaskMode, loading, user }) {
  if (loading) return "批改生成中…";
  if (guestMode || !user) return "提交批改";
  return isTaskMode ? "Submit Assignment" : "Get Writing Feedback";
}

function WritingActionRow({ guestMode, isTaskMode, loading, submitWriting, user }) {
  return (
    <div className="gm-analyzer-actions">
      <button type="button" onClick={submitWriting} disabled={loading} className="gm-btn-primary">
        {submitButtonText({ guestMode, isTaskMode, loading, user })}
      </button>
    </div>
  );
}

function resetWritingPage({ actions, draftActions }) {
  actions.setFeedback(null);
  actions.setStreamText('');
  actions.setError("");
  draftActions.setIsRecognizingPrompt(false);
  draftActions.setIsRecognizingWriting(false);
  draftActions.setText("");
  draftActions.setImage(null);
  draftActions.setImages([]);
  draftActions.setLightboxImg(null);
  draftActions.setPromptText("");
  draftActions.setWritingTitle("");
  draftActions.setAiAnalysis(null);
  draftActions.setManualType('');
  draftActions.setShowManualCorrect(false);
  draftActions.setVersionOfWritingId?.(null);
  window.scrollTo?.({ top: 0, behavior: 'smooth' });
}

function FeedbackSection({
  actions,
  draftActions,
  draftState,
  feedback,
  loading,
  onNavigate,
  user,
}) {
  return (
    <div className="studio-reveal">
      <Suspense fallback={<WritingPanelFallback minHeight={280} />}>
        <FeedbackResultSection
          feedback={feedback}
          loading={loading}
          writingTitle={draftState.writingTitle}
          promptText={draftState.promptText}
          originalText={draftState.text}
          image={draftState.image}
          user={user}
          onNavigate={onNavigate}
          onReset={() => resetWritingPage({ actions, draftActions })}
        />
      </Suspense>
    </div>
  );
}

export default function WritingWorkspace({
  actions,
  currentTaskContext,
  draftActions,
  draftState,
  enableSubstituteUpload,
  error,
  feedback,
  finishVoiceInput,
  guestMode,
  guestSourceMode,
  hasSubmittedTask,
  handlePromptKeyDown,
  handlePromptPaste,
  handleSelectQ,
  handleWritingImage,
  handleWritingPaste,
  isMobile,
  isTaskMode,
  loading,
  onNavigate,
  questions,
  restartVoiceInput,
  scoreMismatchHint,
  serviceError,
  submitWriting,
  toggleVoiceInput,
  uploadPromptImages,
  user,
  voiceListeningTarget,
  voiceSessionStateByTarget,
  voiceStatusByTarget,
  voiceSupported,
  words,
  writingSourceMode,
}) {
  const [cropState, setCropState] = useState({ src: null, callback: null });

  const showCrop = (file, callback) => {
    try {
      validateImageFile(file);
      actions.setError("");
    } catch (error) {
      actions.setError(error.message || "请上传图片文件");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setCropState({ src: e.target.result, callback });
    reader.readAsDataURL(file);
  };

  return (
    <>
      {cropState.src && (
        <CropModal
          src={cropState.src}
          onConfirm={(file) => {
            cropState.callback(file);
            setCropState({ src: null, callback: null });
          }}
          onCancel={() => setCropState({ src: null, callback: null })}
        />
      )}
      <div className="gm-analyzer-workspace writing-studio-workspace studio-reveal studio-reveal--delay-1">
        <div className="writing-studio-stack">
          {serviceError && !guestMode ? <StatusBanner tone="warning">{serviceError}</StatusBanner> : null}
          <SubstituteUploadSection
            classes={draftState.classes}
            enableSubstituteUpload={enableSubstituteUpload}
            isMobile={isMobile}
            onSelectClass={draftActions.setSelectedClass}
            onSelectStudent={draftActions.setSelectedStudent}
            onToggle={draftActions.setSubUploadOpen}
            open={draftState.subUploadOpen}
            selectedClass={draftState.selectedClass}
            selectedStudent={draftState.selectedStudent}
            studentsInClass={draftState.studentsInClass}
            user={user}
          />
          <WritingSourcePanel
            currentTaskContext={currentTaskContext}
            draftState={draftState}
            guestMode={guestMode}
            guestSourceMode={guestSourceMode}
            hasSubmittedTask={hasSubmittedTask}
            handlePromptKeyDown={handlePromptKeyDown}
            handlePromptPaste={handlePromptPaste}
            handleSelectQ={handleSelectQ}
            isMobile={isMobile}
            isTaskMode={isTaskMode}
            onShowCrop={isMobile ? showCrop : undefined}
            questions={questions}
            scoreMismatchHint={scoreMismatchHint}
            serviceError={serviceError}
            setAiAnalysis={draftActions.setAiAnalysis}
            setAssignOpen={draftActions.setAssignOpen}
            setCustomMax={draftActions.setCustomMax}
            setFeedback={actions.setFeedback}
            setIsRecognizingPrompt={draftActions.setIsRecognizingPrompt}
            setManualType={draftActions.setManualType}
            setMaxOpt={draftActions.setMaxOpt}
            setPromptText={draftActions.setPromptText}
            setShowManualCorrect={draftActions.setShowManualCorrect}
            setWritingTitle={draftActions.setWritingTitle}
            toggleVoiceInput={toggleVoiceInput}
            uploadPromptImages={uploadPromptImages}
            voiceListeningTarget={voiceListeningTarget}
            voiceSessionStateByTarget={voiceSessionStateByTarget}
            voiceStatusByTarget={voiceStatusByTarget}
            voiceSupported={voiceSupported}
            writingSourceMode={writingSourceMode}
            restartVoiceInput={restartVoiceInput}
            finishVoiceInput={finishVoiceInput}
          />
          <WritingEditorSection
            draftState={draftState}
            error={error}
            finishVoiceInput={finishVoiceInput}
            handleWritingImage={handleWritingImage}
            handleWritingPaste={handleWritingPaste}
            isMobile={isMobile}
            onShowCrop={isMobile ? showCrop : undefined}
            restartVoiceInput={restartVoiceInput}
            setImage={draftActions.setImage}
            setImages={draftActions.setImages}
            setLightboxImg={draftActions.setLightboxImg}
            setText={draftActions.setText}
            toggleVoiceInput={toggleVoiceInput}
            voiceListeningTarget={voiceListeningTarget}
            voiceSessionStateByTarget={voiceSessionStateByTarget}
            voiceStatusByTarget={voiceStatusByTarget}
            voiceSupported={voiceSupported}
            words={words}
          />
        </div>

        <WritingActionRow
          guestMode={guestMode}
          isTaskMode={isTaskMode}
          loading={loading}
          submitWriting={submitWriting}
          user={user}
        />
        <FeedbackSection
          actions={actions}
          draftActions={draftActions}
          draftState={draftState}
          feedback={feedback}
          loading={loading}
          onNavigate={onNavigate}
          user={user}
        />
      </div>
    </>
  );
}
