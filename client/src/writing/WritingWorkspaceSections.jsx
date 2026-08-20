import { Suspense, lazy } from 'react';

import {
  WritingPanelFallback,
  createImageInput,
} from './WritingPageSupport.jsx';

const WritingEditorPanel = lazy(() => import('./core/WritingEditorPanel.jsx'));
const WritingSourceSection = lazy(() => import('./core/WritingSourceSection.jsx'));
const TeacherSubstitutePanel = lazy(() => import('./core/TeacherSubstitutePanel.jsx'));

export function SubstituteUploadSection({
  classes,
  enableSubstituteUpload,
  isMobile,
  onSelectClass,
  onSelectStudent,
  onToggle,
  open,
  selectedClass,
  selectedStudent,
  studentsInClass,
  user,
}) {
  if (!enableSubstituteUpload || user?.role !== "teacher") return null;

  return (
    <div>
      <Suspense fallback={<WritingPanelFallback minHeight={120} />}>
        <TeacherSubstitutePanel
          isMobile={isMobile}
          open={open}
          onToggle={onToggle}
          selectedStudent={selectedStudent}
          selectedClass={selectedClass}
          onSelectClass={onSelectClass}
          onSelectStudent={onSelectStudent}
          classes={classes}
          studentsInClass={studentsInClass}
        />
      </Suspense>
    </div>
  );
}

export function WritingSourcePanel({
  currentTaskContext,
  draftState,
  guestMode,
  guestSourceMode,
  hasSubmittedTask,
  handlePromptKeyDown,
  handlePromptPaste,
  handleSelectQ,
  isMobile,
  isTaskMode,
  onShowCrop,
  questions,
  scoreMismatchHint,
  serviceError,
  setAiAnalysis,
  setAssignOpen,
  setCustomMax,
  setFeedback,
  setIsRecognizingPrompt,
  setManualType,
  setMaxOpt,
  setPromptText,
  setShowManualCorrect,
  setWritingTitle,
  toggleVoiceInput,
  uploadPromptImages,
  voiceListeningTarget,
  voiceSessionStateByTarget,
  voiceStatusByTarget,
  voiceSupported,
  writingSourceMode,
  restartVoiceInput,
  finishVoiceInput,
}) {
  const uploadPrompt = () => createImageInput({
    multiple: !isMobile,
    onChange: async (event) => {
      if (isMobile && onShowCrop) {
        const file = event.target.files[0];
        if (!file) return;
        onShowCrop(file, (croppedFile) => uploadPromptImages([croppedFile]));
      } else {
        const files = Array.from(event.target.files);
        await uploadPromptImages(files);
      }
    },
  });

  return (
    <div>
      <Suspense fallback={<WritingPanelFallback minHeight={260} />}>
        <WritingSourceSection
          isMobile={isMobile}
          isTaskMode={isTaskMode}
          initialSourceMode={guestMode ? (guestSourceMode || 'manual') : (writingSourceMode || '')}
          hideModeSelector={guestMode && !isTaskMode}
          questionSourceProps={{
            questions,
            selectedQuestionId: draftState.selectedQId,
            onSelectQuestion: (id) => handleSelectQ(id, () => setFeedback(null)),
            title: "Select Topic · 题目选择",
            subtitle: "",
            emptyText: serviceError
              ? `题库加载失败：${serviceError}`
              : "当前没有可选题目，你可以先在教师端工作台维护题库，或直接手动填写题目。",
            isMobile,
          }}
          assignmentPanelProps={{
            isMobile,
            open: draftState.assignOpen,
            onToggle: setAssignOpen,
            forceExpanded: guestMode && guestSourceMode === 'manual',
            taskContext: currentTaskContext,
            selectedQId: draftState.selectedQId,
            maxOpt: draftState.maxOpt,
            customMax: draftState.customMax,
            onSetMaxOpt: setMaxOpt,
            onSetCustomMax: setCustomMax,
            questions,
            onSelectQuestion: (id) => handleSelectQ(id, () => setFeedback(null)),
            writingTitle: draftState.writingTitle,
            onSetWritingTitle: setWritingTitle,
            promptText: draftState.promptText,
            onSetPromptText: setPromptText,
            isRecognizingPrompt: draftState.isRecognizingPrompt,
            onUploadPromptImages: uploadPrompt,
            onPromptPaste: handlePromptPaste,
            onPromptKeyDown: handlePromptKeyDown,
            voiceSupported,
            isVoiceListening: voiceListeningTarget === "prompt",
            voiceSessionState: voiceSessionStateByTarget.prompt,
            voiceStatus: voiceStatusByTarget.prompt,
            onTogglePromptVoice: () => toggleVoiceInput("prompt"),
            onRestartPromptVoice: () => restartVoiceInput("prompt"),
            onFinishPromptVoice: () => finishVoiceInput("prompt"),
            aiAnalysis: draftState.aiAnalysis,
            isRecognizingTags: draftState.isRecognizingTags,
            scoreMismatchHint,
            showSmartTags: (!isTaskMode || hasSubmittedTask) && !!(draftState.promptText?.trim()),
            manualType: draftState.manualType,
            showManualCorrect: draftState.showManualCorrect,
            onToggleManualCorrect: setShowManualCorrect,
            onSetManualType: setManualType,
            onSetAiAnalysis: setAiAnalysis,
            onSetIsRecognizingPrompt: setIsRecognizingPrompt,
          }}
        />
      </Suspense>
    </div>
  );
}

export function WritingEditorSection({
  draftState,
  error,
  finishVoiceInput,
  handleWritingImage,
  handleWritingPaste,
  isMobile,
  onShowCrop,
  restartVoiceInput,
  setImage,
  setImages,
  setLightboxImg,
  setText,
  toggleVoiceInput,
  voiceListeningTarget,
  voiceSessionStateByTarget,
  voiceStatusByTarget,
  voiceSupported,
  words,
}) {
  const uploadWritingImage = () => createImageInput({
    onChange: (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if (isMobile && onShowCrop) {
        onShowCrop(file, handleWritingImage);
      } else {
        handleWritingImage(file);
      }
    },
  });
  const removeWritingImage = (index) => setImages((prev) => {
    const next = prev.filter((_, itemIndex) => itemIndex !== index);
    setImage(next[next.length - 1] || null);
    return next;
  });

  return (
    <div>
      <Suspense fallback={<WritingPanelFallback minHeight={320} />}>
        <WritingEditorPanel
          isMobile={isMobile}
          text={draftState.text}
          words={words}
          error={error}
          image={draftState.image}
          images={draftState.images}
          lightboxImg={draftState.lightboxImg}
          isRecognizingWriting={draftState.isRecognizingWriting}
          onSetText={setText}
          onPaste={handleWritingPaste}
          onUploadImage={uploadWritingImage}
          voiceSupported={voiceSupported}
          isVoiceListening={voiceListeningTarget === "writing"}
          voiceSessionState={voiceSessionStateByTarget.writing}
          voiceStatus={voiceStatusByTarget.writing}
          onToggleVoiceInput={() => toggleVoiceInput("writing")}
          onRestartVoiceInput={() => restartVoiceInput("writing")}
          onFinishVoiceInput={() => finishVoiceInput("writing")}
          onRemoveImage={removeWritingImage}
          onSetLightboxImg={setLightboxImg}
        />
      </Suspense>
    </div>
  );
}
