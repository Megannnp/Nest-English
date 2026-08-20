import { useEffect, useState } from "react";

import { useImageRecognition } from "./useImageRecognition.js";
import { useWritingDraftModel } from "./useWritingDraft.js";
import { shouldTriggerPromptAnalysis, canAnalyzePromptText } from "./useWritingPageModelActions.js";
import { useWritingSubmission } from "./useWritingSubmission.js";
import { useWritingVoiceInput } from "./useWritingVoiceInput.js";

function _shouldKeepCurrentFeedback(current, savedFeedback) {
  const currentProgress = Number(current?.generation?.progress || 0);
  const incomingProgress = Number(savedFeedback?.generation?.progress || 0);
  return current?.generation?.active && savedFeedback?.generation?.active && incomingProgress < currentProgress;
}

export function useWritingPageModel({
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
}) {
  const [feedback, setFeedback] = useState(savedFeedback ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [streamText, setStreamText] = useState("");

  const { state: draftState, actions: draftActions } = useWritingDraftModel({
    user,
    questions,
    preloadedQuestion,
    taskContext,
    initialDraft,
    draftHydrationKey,
    onDraftChange,
    guestMode,
  });

  const {
    setPromptText,
    setText,
    setImages,
    setImage,
    setWritingTitle,
    setIsRecognizingPrompt,
    setIsRecognizingWriting,
    analyzeTags,
  } = draftActions;

  const { state: voiceState, actions: voiceActions } = useWritingVoiceInput({
    draftState,
    setError,
    setPromptText,
    setText,
    setWritingTitle,
  });

  const imageRecognition = useImageRecognition({
    setError,
    setText,
    setPromptText,
    setImages,
    setImage,
    setIsRecognizingPrompt,
    setIsRecognizingWriting,
    promptText: draftState.promptText,
    analyzeTags,
  });

  const { submit } = useWritingSubmission({
    user,
    questions,
    studentsInClass: draftState.studentsInClass,
    onQuestionsChange,
    onWritingSaved,
    onRequireAuth,
    guestMode,
    state: draftState,
    setError,
    setLoading,
    setFeedback,
    setStreamText,
  });

  useEffect(() => {
    onFeedbackChange?.(feedback);
  }, [feedback, onFeedbackChange]);

  useEffect(() => {
    setFeedback((current) => {
      if (!savedFeedback) return current?.generation?.active ? current : null;
      if (_shouldKeepCurrentFeedback(current, savedFeedback)) return current;
      return savedFeedback;
    });
  }, [savedFeedback]);

  const handlePromptKeyDown = (e) => {
    if (!shouldTriggerPromptAnalysis(e)) return;
    e.preventDefault();
    const { promptText, text } = draftState;
    if (canAnalyzePromptText(promptText, text)) {
      analyzeTags(true);
    }
  };

  const { maxOpt, customMax, text, source, taskContext: activeTaskContext } = draftState;
  const currentTaskContext = taskContext || activeTaskContext;
  const isTaskMode = Boolean(currentTaskContext);
  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const max = maxOpt === "custom" ? (parseInt(customMax, 10) || 0) : parseInt(maxOpt, 10);
  const visibleSourceTag = guestMode
    ? null
    : source && source !== "teacher" && (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 12px",
            borderRadius: 20,
            background: source === "homework" ? "#fdf0d8" : "#f5f1eb",
            color: source === "homework" ? "#8b5e1a" : "#6a5a48",
            border: `1px solid ${source === "homework" ? "#f0cc80" : "#e8e0d5"}`,
            cursor: "default",
            opacity: 0.96,
          }}
        >
          {source === "homework" ? "任务模式" : "自由写作模式"}
        </span>
      );

  return {
    state: {
      feedback,
      loading,
      error,
      streamText,
      ...voiceState,
      draftState,
      currentTaskContext,
      isTaskMode,
      words,
      max,
      visibleSourceTag,
    },
    actions: {
      setFeedback,
      setStreamText,
      setError,
      ...voiceActions,
      ...imageRecognition,
      handlePromptKeyDown,
      submitWriting: () => submit({ max, words }),
      ...draftActions,
    },
  };
}
