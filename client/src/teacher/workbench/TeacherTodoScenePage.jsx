import { useEffect } from "react";

import AssignmentDetailPanel from "./AssignmentDetailPanel.jsx";
import DetailListSection, { DraftAssignmentRow, DueSoonRow } from "./DetailListSection.jsx";
import useTeacherWorkbenchModel from "./useTeacherWorkbenchModel.js";
import {
  PendingGradingsSection,
  PendingCommentsSection,
  ExceptionsSection,
} from "./WorkbenchQueueSections.jsx";
import { PageHeader, BackHomeButton, StatusBanner } from "../../components/shared/UI.jsx";

const SCENE_CONFIG = {
  drafts: {
    title: "待发布任务",
    subtitle: "这里专门处理作业草稿，补齐题目、班级和截止时间后再统一发布。",
  },
  gradings: {
    title: "待批改作文",
    subtitle: "这里集中处理学生已提交、需要快速反馈的作文。",
  },
  comments: {
    title: "待补教师评价",
    subtitle: "快速反馈已经返回后，我们在这里继续补充教学点评。",
  },
  exceptions: {
    title: "异常待处理",
    subtitle: "OCR、题目分析或详细反馈失败的作文会统一收在这里。",
  },
  dueSoon: {
    title: "48小时内截止",
    subtitle: "优先查看即将截止但尚未完成的任务，方便及时提醒学生。",
  },
};

export default function TeacherTodoScenePage({
  user,
  isMobile = false,
  scene = "gradings",
  onBackToWorkbench,
  onOpenWriting,
  _onNavigate,
}) {
  const config = SCENE_CONFIG[scene] || SCENE_CONFIG.gradings;
  const {
    state: {
      draftAssignments,
      dueSoonAssignments,
      selectedAssignmentId,
      assignmentDetail,
      assignmentForm,
      questionBank,
      _pendingGradings,
      _pendingComments,
      exceptions,
      gradingClassFilter,
      commentClassFilter,
      gradingClassOptions,
      filteredPendingGradings,
      commentClassOptions,
      filteredPendingComments,
      loading,
      detailLoading,
      error,
      actionLoading,
      actionMessage,
    },
    actions: {
      setGradingClassFilter,
      setCommentClassFilter,
      loadAssignmentDetail,
      handleAssignmentFieldChange,
      handlePickQuestion,
      handleSaveDraft,
      handleOpenWriting,
      handlePublish,
      handleClose,
      handleArchive,
      handleExport,
      handleExportPdf,
    },
  } = useTeacherWorkbenchModel({ user, onOpenWriting });

  useEffect(() => {
    const source = scene === "drafts" ? draftAssignments : scene === "dueSoon" ? dueSoonAssignments : [];
    if (!source.length) return;
    const hasSelected = source.some((item) => String(item.id) === String(selectedAssignmentId));
    if (hasSelected) return;
    loadAssignmentDetail(source[0].id);
  }, [draftAssignments, dueSoonAssignments, loadAssignmentDetail, scene, selectedAssignmentId]);

  const pageActions = (
    <BackHomeButton
      onClick={onBackToWorkbench}
      isMobile={isMobile}
      label="返回工作台"
    />
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        titleEn="Todo Detail"
        titleZh={config.title}
        subtitle={config.subtitle}
        isMobile={isMobile}
        actions={pageActions}
      />

      {error ? (
        <div style={{ fontSize: 14, color: "#b42318", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: 18, padding: "12px 14px" }}>
          {error}
        </div>
      ) : null}

      {actionMessage ? (
        <StatusBanner tone={actionMessage.includes("失败") ? "warning" : "neutral"}>
          {actionMessage}
        </StatusBanner>
      ) : null}

      {scene === "drafts" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(320px, 420px) minmax(0, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <DetailListSection
            title="待发布任务"
            emptyText="当前没有待发布任务。班级创建完成后，作业草稿会统一回到工作台里处理。"
            items={draftAssignments}
            renderItem={(item) => (
              <DraftAssignmentRow
                key={item.id}
                item={item}
                onPublish={handlePublish}
                onLoadAssignmentDetail={loadAssignmentDetail}
              />
            )}
          >
            {detailLoading ? <StatusBanner tone="neutral">正在加载草稿详情...</StatusBanner> : null}
          </DetailListSection>

          <AssignmentDetailPanel
            detail={assignmentDetail}
            form={assignmentForm}
            questions={questionBank}
            onChange={handleAssignmentFieldChange}
            onPickQuestion={handlePickQuestion}
            onSave={handleSaveDraft}
            onPublish={handlePublish}
            onClose={handleClose}
            onArchive={handleArchive}
            onExport={handleExport}
            onExportPdf={handleExportPdf}
            actionLoading={actionLoading}
            actionMessage={actionMessage}
            isMobile={isMobile}
          />
        </div>
      ) : null}

      {scene === "gradings" ? (
        <PendingGradingsSection
          visible={!loading}
          classOptions={gradingClassOptions}
          activeClassFilter={gradingClassFilter}
          onChangeClassFilter={setGradingClassFilter}
          items={filteredPendingGradings}
          onOpenWriting={handleOpenWriting}
        />
      ) : null}

      {scene === "comments" ? (
        <PendingCommentsSection
          visible={!loading}
          classOptions={commentClassOptions}
          activeClassFilter={commentClassFilter}
          onChangeClassFilter={setCommentClassFilter}
          items={filteredPendingComments}
          onOpenWriting={handleOpenWriting}
        />
      ) : null}

      {scene === "exceptions" ? (
        <ExceptionsSection
          visible={!loading}
          items={exceptions}
          onOpenWriting={handleOpenWriting}
        />
      ) : null}

      {scene === "dueSoon" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(320px, 420px) minmax(0, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <DetailListSection
            title="48小时内截止"
            emptyText="当前没有 48 小时内截止的任务。"
            items={dueSoonAssignments}
            renderItem={(item) => (
              <DueSoonRow
                key={item.id}
                item={item}
                onLoadAssignmentDetail={loadAssignmentDetail}
              />
            )}
          />

          <AssignmentDetailPanel
            detail={assignmentDetail}
            form={assignmentForm}
            questions={questionBank}
            onChange={handleAssignmentFieldChange}
            onPickQuestion={handlePickQuestion}
            onSave={handleSaveDraft}
            onPublish={handlePublish}
            onClose={handleClose}
            onArchive={handleArchive}
            onExport={handleExport}
            onExportPdf={handleExportPdf}
            actionLoading={actionLoading}
            actionMessage={actionMessage}
            isMobile={isMobile}
          />
        </div>
      ) : null}
    </div>
  );
}
