import { Suspense, lazy, useEffect, useMemo, useState } from "react";

import { getAssignmentStatusLabel } from "./utils.js";
import { SurfaceCard, SurfaceHeader, SmallActionButton, StatusBanner } from "../../components/shared/UI.jsx";

const QuestionSourceBrowser = lazy(() => import("../../components/questions/QuestionSourceBrowser.jsx"));

const fieldInputStyle = {
  width: "100%",
  border: "1px solid #eadfce",
  borderRadius: 16,
  background: "#fffdf9",
  color: "#2a1f14",
  fontSize: 14,
  padding: "12px 14px",
  outline: "none",
  boxSizing: "border-box",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)",
};

const _selectInputStyle = {
  ...fieldInputStyle,
  padding: "12px 42px 12px 14px",
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9' fill='none'%3E%3Cpath d='M1 1.5L7 7.5L13 1.5' stroke='%238a7d6e' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 14px center",
  backgroundSize: "14px 9px",
};

const panelStyle = {
  borderRadius: 28,
  border: "1px solid rgba(99, 74, 39, 0.1)",
  boxShadow: "0 22px 48px rgba(99, 74, 39, 0.1)",
  overflow: "hidden",
};

const sectionCardStyle = {
  border: "1px solid #ece6de",
  borderRadius: 18,
  background: "linear-gradient(180deg, #fff 0%, #fcfaf7 100%)",
  padding: "14px 14px",
};

const pdfModuleOptions = [
  { id: "overview", label: "作业信息", desc: "导出作业名称、班级、状态、分值、截止时间和写作要求。" },
  { id: "stats", label: "任务统计", desc: "导出待完成、批改中、已返回、已逾期这些任务概况。" },
  { id: "summary", label: "班级汇总", desc: "导出完成率、平均分、高风险占比等汇总指标。" },
  { id: "detail", label: "班级明细", desc: "导出每位学生的提交状态、得分和反馈状态。" },
];

const WRITING_ACCENT = {
  border: "#d8c4a8",
  primary: "#8a5a1f",
  primaryDark: "#5f3d18",
  soft: "#f4eadc",
  shadow: "rgba(138, 90, 31, 0.16)",
};

function QuestionBrowserFallback({ minHeight = 260 }) {
  return (
    <div
      style={{
        minHeight,
        borderRadius: 18,
        border: "1px solid #ece6de",
        background: "linear-gradient(180deg, #fffdfa 0%, #fff 100%)",
      }}
    />
  );
}

function responsiveValue(isMobile, mobileValue, desktopValue) {
  return isMobile ? mobileValue : desktopValue;
}

function gridColumns(isMobile, desktopColumns) {
  return isMobile ? "1fr" : desktopColumns;
}

function actionMessageTone(message) {
  return String(message || "").includes("失败") ? "warning" : "neutral";
}

function ActionMessageBanner({ message, style }) {
  if (!message) return null;
  return <StatusBanner tone={actionMessageTone(message)} style={style}>{message}</StatusBanner>;
}

function classPickerLabel(selectedClassNames, classes) {
  if (selectedClassNames.length) return selectedClassNames.join("、");
  return classes.length ? "请选择班级" : "请先创建班级";
}

function canOpenClassPicker(actionLoading, classes) {
  return !actionLoading && classes.length > 0;
}

function pdfSelectionState(selectedModules) {
  const allSelected = selectedModules.length === pdfModuleOptions.length;
  return {
    allSelected,
    indeterminate: selectedModules.length > 0 && !allSelected,
  };
}

function pdfToggleAllLabel(allSelected) {
  return allSelected ? "取消全选导出模块" : "全选导出模块";
}

function PdfModuleOption({ checked, isMobile, onToggle, option }) {
  return (
    <label
      key={option.id}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        border: checked ? `1px solid ${WRITING_ACCENT.border}` : "1px solid #ece6de",
        background: checked ? "#fffaf1" : "#faf8f5",
        borderRadius: 18,
        padding: isMobile ? "12px 14px" : "14px 16px",
        cursor: "pointer",
      }}
    >
      <input type="checkbox" checked={checked} onChange={() => onToggle(option.id)} style={{ marginTop: 2, width: 16, height: 16 }} />
      <div>
        <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 700, color: "#2a1f14" }}>{option.label}</div>
        <div style={{ marginTop: 4, fontSize: 12, color: "#8a7d6e", lineHeight: 1.7 }}>{option.desc}</div>
      </div>
    </label>
  );
}

function PdfExportDialog({ open, selectedModules, onToggle, onToggleAll, onCancel, onConfirm, loading, isMobile = false }) {
  if (!open) return null;

  const { allSelected, indeterminate } = pdfSelectionState(selectedModules);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? 12 : 20,
        zIndex: 1200,
      }}
    >
      <button type="button" aria-label="取消导出 PDF" onClick={onCancel} style={{ position: "fixed", inset: 0, border: 0, padding: 0, background: "rgba(37, 28, 16, 0.28)" }} />
      <div
        style={{
          position: "relative",
          width: "min(560px, 100%)",
          background: "#fffdf9",
          border: "1px solid #eadfce",
          borderRadius: responsiveValue(isMobile, 18, 24),
          boxShadow: "0 24px 60px rgba(42, 31, 20, 0.14)",
          padding: responsiveValue(isMobile, 16, 22),
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxHeight: responsiveValue(isMobile, "88vh", "none"),
          overflowY: responsiveValue(isMobile, "auto", "visible"),
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: responsiveValue(isMobile, 18, 22), fontWeight: 800, color: "#2a1f14", lineHeight: 1.2 }}>导出 PDF</div>
            <div style={{ marginTop: 6, fontSize: responsiveValue(isMobile, 12, 13), color: "#8a7d6e", lineHeight: 1.8 }}>
              勾选你想导出的模块。确认后会打开浏览器打印面板，直接选择“存储为 PDF”即可。
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              border: "1px solid #e7dbcf",
              borderRadius: 999,
              background: "#faf8f5",
              color: "#8a7d6e",
              width: 38,
              height: 38,
              fontSize: 18,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        <button
          type="button"
          aria-label={pdfToggleAllLabel(allSelected)}
          onClick={onToggleAll}
          style={{
            alignSelf: "flex-start",
            padding: "8px 14px",
            borderRadius: 999,
            border: `1px solid ${allSelected || indeterminate ? WRITING_ACCENT.border : "#e7dbcf"}`,
            background: allSelected || indeterminate ? WRITING_ACCENT.soft : "#faf8f5",
            color: allSelected || indeterminate ? WRITING_ACCENT.primaryDark : "#8a7d6e",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {allSelected ? "取消全选" : "全选模块"}
        </button>

        <div style={{ display: "grid", gap: 10 }}>
          {pdfModuleOptions.map((option) => <PdfModuleOption key={option.id} option={option} checked={selectedModules.includes(option.id)} onToggle={onToggle} isMobile={isMobile} />)}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", flexDirection: responsiveValue(isMobile, "column-reverse", "row") }}>
          <SmallActionButton onClick={onCancel} style={isMobile ? { width: "100%" } : undefined}>取消</SmallActionButton>
          <SmallActionButton disabled={loading || selectedModules.length === 0} onClick={onConfirm} style={isMobile ? { width: "100%" } : undefined}>
            {loading ? "导出中..." : "确认导出"}
          </SmallActionButton>
        </div>
      </div>
    </div>
  );
}

function SectionCard({ title, children, style }) {
  return (
    <div style={{ ...sectionCardStyle, ...style }}>
      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1.1, color: "#b97b20", textTransform: "uppercase", marginBottom: 10 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ContentModeSwitch({ value, onChange, disabled = false }) {
  const options = [
    { id: "manual", label: "输入题目" },
    { id: "bank", label: "选择题目" },
  ];

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {options.map((item) => {
        const active = value === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            disabled={disabled}
            style={{
              minWidth: 120,
              padding: "10px 14px",
              borderRadius: 16,
              border: active ? `1px solid ${WRITING_ACCENT.border}` : "1px solid #eadfce",
              background: active ? "#fff8ee" : "#fffdf9",
              color: active ? WRITING_ACCENT.primaryDark : "#7a6754",
              fontSize: 13,
              fontWeight: 700,
              cursor: disabled ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: active ? `0 10px 22px ${WRITING_ACCENT.shadow}` : "inset 0 1px 0 rgba(255,255,255,0.7)",
              opacity: disabled ? 0.7 : 1,
              textAlign: "center",
            }}
          >
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function formatAssignmentTime(value) {
  if (!value) return "未记录";
  return new Date(value).toLocaleString("zh-CN");
}

function buildAssignmentCardModel(assignment, selected) {
  const isDraft = assignment.status === "draft";
  const isPublished = assignment.status === "published";
  const isClosed = assignment.status === "closed";
  return {
    dueLabel: assignment?.dueAt ? formatAssignmentTime(assignment.dueAt) : "未设置截止时间",
    isClosed,
    isDraft,
    isPublished,
    statusLabel: getAssignmentStatusLabel(assignment.status),
    statusText: isDraft ? "Draft Task" : isPublished ? "Active Task" : "Closed Task",
    timeLabel: isDraft ? "编辑时间" : "发布时间",
    timeValue: formatAssignmentTime(assignment.updatedAt || assignment.createdAt),
    selected,
  };
}

function StatusPill({ assignment, model }) {
  return (
    <span
      style={{
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid #e7dbcf",
        background: assignment.status === "published" ? "#fdf0d8" : assignment.status === "closed" ? "#fff7ed" : "#fff",
        color: assignment.status === "published" ? WRITING_ACCENT.primaryDark : assignment.status === "closed" ? WRITING_ACCENT.primary : "#8a7d6e",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {model.statusLabel}
    </span>
  );
}

function AssignmentCardActions({ model, onArchive, onClose, onEdit, onExport, onPublish, onSelect }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
      <SmallActionButton tone={model.selected ? "soft" : "subtle"} onClick={onSelect}>{model.selected ? "查看详情中" : "查看详情"}</SmallActionButton>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
        {model.isDraft ? <SmallActionButton tone="primary" onClick={onPublish}>发布</SmallActionButton> : null}
        {model.isDraft && onEdit ? <SmallActionButton onClick={onEdit}>编辑任务</SmallActionButton> : null}
        {model.isPublished ? <SmallActionButton onClick={onClose}>关闭</SmallActionButton> : null}
        {model.isClosed ? <SmallActionButton onClick={onArchive}>归档</SmallActionButton> : null}
        {!model.isDraft ? <SmallActionButton onClick={() => onExport("detail")}>明细导出</SmallActionButton> : null}
      </div>
    </div>
  );
}

function ClassPickerDropdown({ classes, isMobile, onToggleClass, selectedClassIds }) {
  if (!classes.length) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        left: 0,
        right: 0,
        zIndex: 20,
        border: "1px solid #eadfce",
        borderRadius: 18,
        background: "#fffdf9",
        boxShadow: "0 18px 36px rgba(42, 31, 20, 0.12)",
        padding: 10,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        maxHeight: isMobile ? 260 : 320,
        overflowY: "auto",
      }}
    >
      {classes.map((item) => {
        const checked = selectedClassIds.includes(String(item.id));
        return (
          <label
            key={item.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 14,
              background: checked ? "#f4f0e9" : "transparent",
              color: "#2a1f14",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: checked ? 700 : 500,
            }}
          >
            <input type="checkbox" checked={checked} onChange={() => onToggleClass(item.id)} />
            <span>{item.className || item.name || "未命名班级"}</span>
          </label>
        );
      })}
    </div>
  );
}

function NewAssignmentPanel({
  actionLoading,
  actionMessage,
  classes,
  contentMode,
  form,
  handleChangeContentMode,
  isMobile,
  onChange,
  onCreate,
  onCreateAndPublish,
  onPickQuestion,
  questions,
  selectedClassIds,
  selectedClassNames,
  showClassPicker,
  setShowClassPicker,
  toggleClassSelection,
}) {
  return (
    <SurfaceCard style={{ ...panelStyle, background: "linear-gradient(180deg, #fffdf9 0%, #fff 100%)" }}>
      <SurfaceHeader title="新建写作任务" badge="草稿" />
      <ActionMessageBanner message={actionMessage} style={{ margin: "0 20px" }} />
      <div style={{ padding: "18px 20px 22px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SectionCard title="基本信息">
            <div style={{ display: "grid", gridTemplateColumns: gridColumns(isMobile, "repeat(2, minmax(0, 1fr))"), gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: "#8a7d6e", marginBottom: 8 }}>选择班级</div>
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canOpenClassPicker(actionLoading, classes)) return;
                      setShowClassPicker((current) => !current);
                    }}
                    style={{
                      ...fieldInputStyle,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: canOpenClassPicker(actionLoading, classes) ? "pointer" : "default",
                      textAlign: "left",
                    }}
                  >
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {classPickerLabel(selectedClassNames, classes)}
                    </span>
                    <span style={{ color: "#8a7d6e", flexShrink: 0 }}>{showClassPicker ? "▲" : "▼"}</span>
                  </button>

                  {showClassPicker ? <ClassPickerDropdown classes={classes} isMobile={isMobile} onToggleClass={toggleClassSelection} selectedClassIds={selectedClassIds} /> : null}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#8a7d6e", marginBottom: 8 }}>作业标题</div>
                <input aria-label="作业标题" value={form.title} onChange={(e) => onChange("title", e.target.value)} disabled={actionLoading} style={fieldInputStyle} placeholder="例如：高二议论文周练" />
              </div>
            </div>
          </SectionCard>

          <SectionCard title="题目内容">
            <DraftPromptEditor actionLoading={actionLoading} contentMode={contentMode} form={form} handleChangeContentMode={handleChangeContentMode} isDraft isMobile={isMobile} onChange={onChange} onPickQuestion={onPickQuestion} questions={questions} />
          </SectionCard>

          <SectionCard title="发布设置">
            <AssignmentSettingsFields actionLoading={actionLoading} form={form} isDraft isMobile={isMobile} onChange={onChange} />
          </SectionCard>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <ActionMessageBanner message={actionMessage} style={{ flexBasis: "100%" }} />
            <SmallActionButton tone="soft" disabled={actionLoading || classes.length === 0} onClick={onCreate} style={{ padding: "10px 16px", borderRadius: 999 }}>
              {actionLoading ? "处理中..." : "保存草稿"}
            </SmallActionButton>
            <SmallActionButton tone="primary" disabled={actionLoading || classes.length === 0} onClick={onCreateAndPublish} style={{ padding: "10px 16px", borderRadius: 999, boxShadow: `0 12px 28px ${WRITING_ACCENT.shadow}` }}>
              {actionLoading ? "处理中..." : "立即发布"}
            </SmallActionButton>
          </div>
        </div>
      </div>
    </SurfaceCard>
  );
}

function SummaryGrid({ isMobile, summary }) {
  const items = [
    { label: "任务总数", value: summary.totalCount ?? 0 },
    { label: "待完成", value: summary.pendingCount ?? 0 },
    { label: "批改中", value: summary.gradingCount ?? 0 },
    { label: "已返回", value: summary.returnedCount ?? 0 },
    { label: "已逾期", value: summary.overdueCount ?? 0 },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(5, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
      {items.map((item) => (
        <div key={item.label} style={{ border: "1px solid #ece6de", borderRadius: 18, padding: "12px 14px", background: "linear-gradient(180deg, #fff 0%, #fcfaf7 100%)" }}>
          <div style={{ fontSize: 12, color: "#a09080" }}>{item.label}</div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800, color: "#2a1f14", lineHeight: 1 }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function DraftPromptEditor({ actionLoading, contentMode, form, handleChangeContentMode, isDraft, isMobile, onChange, onPickQuestion, questions }) {
  if (!isDraft) {
    return (
      <textarea aria-label="题目内容" value={form.promptText} onChange={(e) => onChange("promptText", e.target.value)} disabled rows={isMobile ? 6 : 8} style={{ ...fieldInputStyle, minHeight: 180, resize: "vertical", opacity: 0.72 }} />
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <ContentModeSwitch value={contentMode} onChange={handleChangeContentMode} disabled={actionLoading} />
      {contentMode === "manual" ? (
        <textarea aria-label="题目内容" value={form.promptText} onChange={(e) => onChange("promptText", e.target.value)} disabled={!isDraft || actionLoading} rows={isMobile ? 6 : 8} style={{ ...fieldInputStyle, minHeight: 180, resize: "vertical", opacity: isDraft ? 1 : 0.72 }} />
      ) : (
        <Suspense fallback={<QuestionBrowserFallback />}>
          <QuestionSourceBrowser questions={questions} selectedQuestionId={form.questionId} onSelectQuestion={onPickQuestion} title="" subtitle="" emptyText="当前没有可用题目" isMobile={isMobile} />
        </Suspense>
      )}
    </div>
  );
}

function AssignmentSettingsFields({ actionLoading, form, isDraft = true, isMobile, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: gridColumns(isMobile, "repeat(3, minmax(0, 1fr))"), gap: 14 }}>
      <div>
        <div style={{ fontSize: 12, color: "#8a7d6e", marginBottom: 8 }}>满分</div>
        <input aria-label="满分" type="number" min="1" value={form.maxScore} onChange={(e) => onChange("maxScore", e.target.value)} disabled={!isDraft || actionLoading} style={{ ...fieldInputStyle, opacity: isDraft ? 1 : 0.72 }} />
      </div>
      <div>
        <div style={{ fontSize: 12, color: "#8a7d6e", marginBottom: 8 }}>截止时间</div>
        <input aria-label="截止时间" type="datetime-local" value={form.dueAt} onChange={(e) => onChange("dueAt", e.target.value)} disabled={!isDraft || actionLoading} style={{ ...fieldInputStyle, opacity: isDraft ? 1 : 0.72 }} />
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 10, border: isDraft ? "1px solid #eadfce" : "1px solid #ece6de", borderRadius: isDraft ? 16 : 14, background: isDraft ? "#fffdf9" : "#faf8f5", padding: "12px 14px", color: "#2a1f14", opacity: isDraft ? 1 : 0.72 }}>
        <input type="checkbox" checked={Boolean(form.allowLate)} onChange={(e) => onChange("allowLate", e.target.checked)} disabled={!isDraft || actionLoading} />
        <span style={{ fontSize: 13 }}>允许逾期补交</span>
      </label>
    </div>
  );
}

function ExistingAssignmentActions({ actionLoading, assignment, isClosed, isDraft, isPublished, onArchive, onClose, onExport, onOpenPdfDialog, onPublish, onSave }) {
  return (
    <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 10 }}>
      {isDraft ? <SmallActionButton disabled={actionLoading} onClick={() => onSave?.(assignment.id)}>保存草稿</SmallActionButton> : null}
      {isDraft ? <SmallActionButton disabled={actionLoading} onClick={() => onPublish?.(assignment.id)}>发布任务</SmallActionButton> : null}
      {isPublished ? <SmallActionButton disabled={actionLoading} onClick={() => onClose?.(assignment.id)}>关闭任务</SmallActionButton> : null}
      {isClosed && onArchive ? <SmallActionButton disabled={actionLoading} onClick={() => onArchive?.(assignment.id)}>归档任务</SmallActionButton> : null}
      {!isDraft ? <SmallActionButton disabled={actionLoading} onClick={() => onExport?.(assignment.id, "detail")}>导出学生明细</SmallActionButton> : null}
      {!isDraft ? <SmallActionButton disabled={actionLoading} onClick={onOpenPdfDialog}>导出 PDF</SmallActionButton> : null}
    </div>
  );
}

function ExistingAssignmentPanel({
  actionLoading,
  actionMessage,
  assignment,
  contentMode,
  form,
  handleChangeContentMode,
  handleConfirmExportPdf,
  isMobile,
  onArchive,
  onChange,
  onClose,
  onExport,
  onPickQuestion,
  onPublish,
  onSave,
  pdfDialogOpen,
  questions,
  selectedPdfModules,
  setPdfDialogOpen,
  summary,
  toggleAllPdfModules,
  togglePdfModule,
}) {
  const isDraft = assignment.status === "draft";
  const isPublished = assignment.status === "published";
  const isClosed = assignment.status === "closed";

  return (
    <SurfaceCard style={{ ...panelStyle, background: "linear-gradient(180deg, #fffdfa 0%, #fff 100%)" }}>
      <SurfaceHeader title="作业详情" badge={getAssignmentStatusLabel(assignment.status)} />
      <ActionMessageBanner message={actionMessage} style={{ margin: "0 20px" }} />
      <div style={{ padding: "18px 20px 22px" }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, color: "#2a1f14", lineHeight: 1.2 }}>
            {assignment.title || "未命名作业"}
          </div>
        </div>

        <SummaryGrid isMobile={isMobile} summary={summary} />

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <SectionCard title="基本信息">
            <div style={{ display: "grid", gridTemplateColumns: gridColumns(isMobile, "repeat(2, minmax(0, 1fr))"), gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, color: "#8a7d6e", marginBottom: 8 }}>作业标题</div>
                <input aria-label="作业标题" value={form.title} onChange={(e) => onChange("title", e.target.value)} disabled={!isDraft || actionLoading} style={{ ...fieldInputStyle, opacity: isDraft ? 1 : 0.72 }} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#8a7d6e", marginBottom: 8 }}>班级</div>
                <button type="button" aria-label={`当前班级：${assignment.className || "未关联班级"}`} disabled={!isDraft || actionLoading} style={{ ...fieldInputStyle, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: isDraft ? 1 : 0.82, cursor: isDraft ? "pointer" : "not-allowed", textAlign: "left" }}>
                  <span>{assignment.className || "未关联班级"}</span>
                  <span>{getAssignmentStatusLabel(assignment.status)}</span>
                </button>
                {!isDraft ? (
                  <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: "#8a7d6e" }}>已发布或已关闭任务暂不支持更换班级。</div>
                    <div style={{ fontSize: 12, lineHeight: 1.6, color: "#8a7d6e" }}>当前可继续修改标题、题目内容、截止时间和满分设置；如需更换班级，请新建任务。</div>
                  </div>
                ) : null}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="题目内容">
            <DraftPromptEditor actionLoading={actionLoading} contentMode={contentMode} form={form} handleChangeContentMode={handleChangeContentMode} isDraft={isDraft} isMobile={isMobile} onChange={onChange} onPickQuestion={onPickQuestion} questions={questions} />
          </SectionCard>

          <SectionCard title="发布设置">
            <AssignmentSettingsFields actionLoading={actionLoading} form={form} isDraft={isDraft} isMobile={isMobile} onChange={onChange} />
          </SectionCard>
        </div>

        <ActionMessageBanner message={actionMessage} style={{ flexBasis: "100%", marginTop: 16 }} />
        <ExistingAssignmentActions actionLoading={actionLoading} assignment={assignment} isClosed={isClosed} isDraft={isDraft} isPublished={isPublished} onArchive={onArchive} onClose={onClose} onExport={onExport} onOpenPdfDialog={() => setPdfDialogOpen(true)} onPublish={onPublish} onSave={onSave} />

        <PdfExportDialog open={pdfDialogOpen} selectedModules={selectedPdfModules} onToggle={togglePdfModule} onToggleAll={toggleAllPdfModules} onCancel={() => setPdfDialogOpen(false)} onConfirm={handleConfirmExportPdf} loading={actionLoading} isMobile={isMobile} />
      </div>
    </SurfaceCard>
  );
}

export function AssignmentCard({ assignment, onSelect, onPublish, onClose, onArchive, onExport, onEdit, selected = false }) {
  const model = buildAssignmentCardModel(assignment, selected);

  return (
    <div
      style={{
        border: selected ? `1.5px solid ${WRITING_ACCENT.border}` : "1px solid rgba(99, 74, 39, 0.08)",
        borderRadius: 20,
        background: selected ? "linear-gradient(180deg, #fff9ef 0%, #fff 100%)" : "linear-gradient(180deg, #fff 0%, #fcfaf7 100%)",
        padding: "16px 16px 15px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: selected ? `0 16px 34px ${WRITING_ACCENT.shadow}` : "0 10px 24px rgba(95, 70, 35, 0.05)",
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.1, color: selected ? "#b97b20" : "#a09080", textTransform: "uppercase" }}>
        {model.statusText}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#2a1f14", lineHeight: 1.45 }}>
            {assignment.title || "未命名作业"}
          </div>
          <div style={{ fontSize: 12, color: "#8a7d6e", marginTop: 5 }}>
            {assignment.className || "未关联班级"} · 满分 {assignment.maxScore || 15} 分
          </div>
        </div>
        <StatusPill assignment={assignment} model={model} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <div style={{ fontSize: 12, color: "#a09080", lineHeight: 1.75 }}>截止时间：{model.dueLabel}</div>
        <div style={{ fontSize: 12, color: "#a09080", lineHeight: 1.75 }}>{model.timeLabel}：{model.timeValue}</div>
      </div>
      <AssignmentCardActions model={model} onArchive={onArchive} onClose={onClose} onEdit={onEdit} onExport={onExport} onPublish={onPublish} onSelect={onSelect} />
    </div>
  );
}

export default function AssignmentDetailPanel({
  detail,
  form,
  classes = [],
  questions = [],
  onChange,
  onCreate,
  onCreateAndPublish,
  onPickQuestion,
  onSave,
  onPublish,
  onClose,
  onArchive,
  onExport,
  onExportPdf,
  actionLoading,
  actionMessage,
  isMobile = false,
}) {
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [selectedPdfModules, setSelectedPdfModules] = useState(["overview", "stats", "summary", "detail"]);
  const [_showQuestionBrowser, setShowQuestionBrowser] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [contentMode, setContentMode] = useState(form.questionId ? "bank" : "manual");
  const _selectedPdfCount = selectedPdfModules.length;
  const selectedClassNames = useMemo(() => {
    const selectedIds = Array.isArray(form.classIds) ? form.classIds.map(String) : [];
    return classes
      .filter((item) => selectedIds.includes(String(item.id)))
      .map((item) => item.className || item.name || "未命名班级");
  }, [classes, form.classIds]);
  const selectedClassIds = useMemo(
    () => (Array.isArray(form.classIds) ? form.classIds.map(String) : []),
    [form.classIds]
  );

  useEffect(() => {
    setContentMode(form.questionId ? "bank" : "manual");
  }, [form.questionId]);

  const toggleClassSelection = (classId) => {
    const nextId = String(classId);
    const current = Array.isArray(form.classIds) ? form.classIds.map(String) : [];
    if (current.includes(nextId)) {
      const next = current.filter((item) => item !== nextId);
      onChange("classIds", next);
      if (!detail?.assignment) {
        onChange("classId", next[0] || "");
      }
      return;
    }
    const next = [...current, nextId];
    onChange("classIds", next);
    if (!detail?.assignment) {
      onChange("classId", next[0] || "");
    }
  };

  const handleChangeContentMode = (mode) => {
    setContentMode(mode);
    if (mode === "manual") {
      setShowQuestionBrowser(false);
      if (form.questionId) {
        onChange("questionId", "");
        onChange("questionTitle", "");
      }
      return;
    }
    setShowQuestionBrowser(true);
  };

  if (!detail?.assignment) {
    return (
      <NewAssignmentPanel
        actionLoading={actionLoading}
        actionMessage={actionMessage}
        classes={classes}
        contentMode={contentMode}
        form={form}
        handleChangeContentMode={handleChangeContentMode}
        isMobile={isMobile}
        onChange={onChange}
        onCreate={onCreate}
        onCreateAndPublish={onCreateAndPublish}
        onPickQuestion={onPickQuestion}
        questions={questions}
        selectedClassIds={selectedClassIds}
        selectedClassNames={selectedClassNames}
        showClassPicker={showClassPicker}
        setShowClassPicker={setShowClassPicker}
        toggleClassSelection={toggleClassSelection}
      />
    );
  }

  const assignment = detail.assignment;
  const summary = detail.summary || {};

  const togglePdfModule = (moduleId) => {
    setSelectedPdfModules((prev) => {
      if (prev.includes(moduleId)) {
        return prev.filter((item) => item !== moduleId);
      }
      return [...prev, moduleId];
    });
  };

  const toggleAllPdfModules = () => {
    setSelectedPdfModules((prev) => {
      if (prev.length === pdfModuleOptions.length) {
        return [];
      }
      return pdfModuleOptions.map((item) => item.id);
    });
  };

  const handleConfirmExportPdf = () => {
    if (!selectedPdfModules.length) return;
    onExportPdf?.(assignment.id, selectedPdfModules);
    setPdfDialogOpen(false);
  };

  return (
    <ExistingAssignmentPanel
      actionLoading={actionLoading}
      actionMessage={actionMessage}
      assignment={assignment}
      contentMode={contentMode}
      form={form}
      handleChangeContentMode={handleChangeContentMode}
      handleConfirmExportPdf={handleConfirmExportPdf}
      isMobile={isMobile}
      onArchive={onArchive}
      onChange={onChange}
      onClose={onClose}
      onExport={onExport}
      onPickQuestion={onPickQuestion}
      onPublish={onPublish}
      onSave={onSave}
      pdfDialogOpen={pdfDialogOpen}
      questions={questions}
      selectedPdfModules={selectedPdfModules}
      setPdfDialogOpen={setPdfDialogOpen}
      summary={summary}
      toggleAllPdfModules={toggleAllPdfModules}
      togglePdfModule={togglePdfModule}
    />
  );

}
