import { useEffect } from "react";

import AssignmentDetailPanel from "./workbench/AssignmentDetailPanel.jsx";
import useTeacherWorkbenchModel from "./workbench/useTeacherWorkbenchModel.js";
import { BackHomeButton, LargePageHeader, StatusBanner } from "../components/shared/UI.jsx";

export default function TeacherAssignmentCreatePage({ user, isMobile = false, initialSelectedAssignmentId = "", onBackToWorkbench, onOpenWriting }) {
  const {
    state: {
      classes,
      assignmentDetail,
      assignmentForm,
      questionBank,
      error,
      detailLoading,
      actionLoading,
      actionMessage,
    },
    actions: {
      clearAssignmentSelection,
      loadAssignmentDetail,
      handleAssignmentFieldChange,
      handleCreateDraft,
      handleCreateAndPublish,
      handlePickQuestion,
      handleSaveDraft,
      handlePublish,
      handleClose,
      handleExport,
      handleExportPdf,
    },
  } = useTeacherWorkbenchModel({ user, onOpenWriting, onReturnToWorkbench: onBackToWorkbench });

  useEffect(() => {
    if (initialSelectedAssignmentId) {
      loadAssignmentDetail(initialSelectedAssignmentId);
      return;
    }
    clearAssignmentSelection();
  }, [clearAssignmentSelection, initialSelectedAssignmentId, loadAssignmentDetail]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <LargePageHeader
        eyebrow="TASKS"
        title="新建写作任务"
        isMobile={isMobile}
        action={(
          <BackHomeButton
            onClick={onBackToWorkbench}
            isMobile={isMobile}
            label="返回工作台"
          />
        )}
      />

      {error ? <StatusBanner tone="warning">{error}</StatusBanner> : null}

      <AssignmentDetailPanel
        detail={assignmentDetail}
        form={assignmentForm}
        classes={classes}
        questions={questionBank}
        onChange={handleAssignmentFieldChange}
        onCreate={handleCreateDraft}
        onCreateAndPublish={handleCreateAndPublish}
        onPickQuestion={handlePickQuestion}
        onSave={handleSaveDraft}
        onPublish={handlePublish}
        onClose={handleClose}
        onExport={handleExport}
        onExportPdf={handleExportPdf}
        actionLoading={actionLoading || detailLoading}
        actionMessage={actionMessage}
        isMobile={isMobile}
      />
    </div>
  );
}
