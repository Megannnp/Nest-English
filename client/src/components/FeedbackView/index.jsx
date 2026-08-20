import { Suspense, lazy, useEffect, useMemo, useState } from 'react';

import {
  adaptFeedbackData,
  getSurname,
  normalizeType,
  TYPE_LABELS,
} from './feedbackAdapter';
import { buildAnalysisStatusState, buildEvaluationStatusState } from './FeedbackStatusNotice.jsx';
import {
  EmptyFeedbackState,
  FeedbackSectionFallback,
  FeedbackTabbedPanel,
  GenerationProgress,
} from './FeedbackViewPanels.jsx';
import useIsMobile from '../../hooks/useIsMobile.js';
import '../../writing/writing.css';

const FeedbackOverview = lazy(() => import('./FeedbackOverview'));
const FeedbackAIEvaluation = lazy(() => import('./FeedbackAIEvaluation').then((module) => ({ default: module.FeedbackAIEvaluation })));
const FeedbackAnalysisPanel = lazy(() => import('./FeedbackAIEvaluation').then((module) => ({ default: module.FeedbackAnalysisPanel })));

function resolveRawWritingType({ feedback, question, safeData }) {
  return safeData?.questionAnalysis?.type ||
    feedback?.questionAnalysis?.type ||
    feedback?.writingType ||
    feedback?.type ||
    feedback?.selectedType ||
    question?.type ||
    'general';
}

function buildAnalysisFeedback(safeData) {
  return {
    ...safeData,
    overview: safeData?.overview ?? safeData?.questionAnalysis?.overview,
    reason: safeData?.reason ?? safeData?.questionAnalysis?.reason,
  };
}

function buildExportPayload({
  annotatedImage,
  feedback,
  originalText,
  promptText,
  question,
  safeData,
  studentName,
  teacherComment,
  teacherSurname,
  typeInfo,
  user,
}) {
  return {
    annotatedImage,
    feedback,
    originalText,
    promptText,
    question,
    safeData,
    studentName,
    teacherComment,
    teacherSurname,
    typeInfo,
    user,
  };
}

export default function FeedbackView({
  feedback,
  loading = false,
  question,
  _writingImage,
  studentName,
  user,
  teacherComment: initialTeacherComment = '',
  annotatedImage: initialAnnotatedImage = null,
  _onSaveTeacherComment,
  isTeacher: _isTeacher = false,
  originalText,
  promptText,
  isMobile: forcedIsMobile,
  onNavigate,
}) {
  const autoIsMobile = useIsMobile();
  const isMobile = forcedIsMobile ?? autoIsMobile;
  const safeFeedback = useMemo(() => adaptFeedbackData(feedback || {}, question), [feedback, question]);
  const [aiTab, setAiTab] = useState('evaluation');
  const [teacherComment, setTeacherComment] = useState(initialTeacherComment);
  const [annotatedImage, setAnnotatedImage] = useState(initialAnnotatedImage);
  const [_savingComment, _setSavingComment] = useState(false);
  const [pdfBlockedMsg, setPdfBlockedMsg] = useState('');

  useEffect(() => {
    setTeacherComment(initialTeacherComment);
  }, [initialTeacherComment]);

  useEffect(() => {
    setAnnotatedImage(initialAnnotatedImage);
  }, [initialAnnotatedImage]);

  const safeData = useMemo(() => safeFeedback || {}, [safeFeedback]);
  const rawType = resolveRawWritingType({ feedback, question, safeData });
  const writingType = normalizeType(rawType);
  const typeInfo = TYPE_LABELS[writingType] || TYPE_LABELS.general;
  const teacherSurname = getSurname(user?.realName || user?.name);
  const analysisStatusState = useMemo(
    () => buildAnalysisStatusState(safeData, typeInfo?.subtitle || typeInfo?.title || ''),
    [safeData, typeInfo]
  );
  const evaluationStatusState = useMemo(
    () => buildEvaluationStatusState(safeData),
    [safeData]
  );
  const analysisFeedback = useMemo(() => buildAnalysisFeedback(safeData), [safeData]);

  const exportPayload = useMemo(() => buildExportPayload({
    annotatedImage,
    feedback,
    originalText,
    promptText,
    question,
    safeData,
    studentName,
    teacherComment,
    teacherSurname,
    typeInfo,
    user,
  }), [annotatedImage, feedback, originalText, promptText, question, safeData, studentName, teacherComment, teacherSurname, typeInfo, user]);

  const handleExportPDF = async () => {
    setPdfBlockedMsg('');
    const { buildFeedbackPdfHtml } = await import('./feedbackPrint');
    const pdfHtml = buildFeedbackPdfHtml(exportPayload);
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setPdfBlockedMsg('请在浏览器中允许弹出窗口，然后再试一次。');
      return;
    }
    printWindow.document.write(pdfHtml);
    printWindow.document.close();
  };

  if (!feedback) {
    return <EmptyFeedbackState />;
  }

  return (
    <div className="writing-feedback-view" style={{
      fontFamily: '"SF Pro Display", "SF Pro Text", "PingFang SC", "Hiragino Sans GB", "Noto Sans SC", sans-serif',
    }}>
      <div className="writing-feedback-view__inner">
        {pdfBlockedMsg ? (
          <div style={{ fontSize: 13, color: '#92400e', background: '#fff7ed', border: '1px solid #fdba74', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
            {pdfBlockedMsg}
          </div>
        ) : null}
        <GenerationProgress generation={safeData?.generation} />
        <Suspense fallback={<FeedbackSectionFallback minHeight={240} />}>
          <FeedbackOverview
            safeData={safeData}
            typeInfo={typeInfo}
            question={question}
            feedback={feedback}
            onExportPDF={handleExportPDF}
            originalText={originalText}
            isMobile={isMobile}
          />
        </Suspense>

        <FeedbackTabbedPanel
          aiTab={aiTab}
          analysisFeedback={analysisFeedback}
          analysisStatusState={analysisStatusState}
          evaluationStatusState={evaluationStatusState}
          FeedbackAIEvaluation={FeedbackAIEvaluation}
          FeedbackAnalysisPanel={FeedbackAnalysisPanel}
          isMobile={isMobile}
          loading={loading}
          onNavigate={onNavigate}
          originalText={originalText}
          promptText={promptText}
          question={question}
          safeData={safeData}
          writingType={writingType}
          onSetTab={setAiTab}
        />
      </div>
    </div>
  );
}
