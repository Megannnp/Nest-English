import { Suspense } from "react";

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

function ClassSelectionButton({
  allowClassSelection,
  actionLoading,
  classes,
  selectedClassNames,
  assignment,
  showClassPicker,
  setShowClassPicker,
  isEditable,
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (!allowClassSelection || actionLoading || classes.length === 0) return;
        setShowClassPicker((current) => !current);
      }}
      style={{
        ...fieldInputStyle,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        cursor: allowClassSelection && classes.length > 0 ? "pointer" : "default",
        opacity: isEditable ? 1 : 0.72,
        textAlign: "left",
      }}
    >
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {selectedClassNames.length
          ? selectedClassNames.join("、")
          : (classes.length
            ? (assignment?.className || "请选择班级")
            : "请先创建班级")}
      </span>
      {allowClassSelection ? <span style={{ color: "#8a7d6e", flexShrink: 0 }}>{showClassPicker ? "▲" : "▼"}</span> : null}
    </button>
  );
}

function ClassPickerDropdown({ showClassPicker, allowClassSelection, classes, isMobile, selectedClassIds, toggleClassSelection }) {
  if (!showClassPicker || !allowClassSelection || classes.length === 0) return null;

  return (
    <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0, zIndex: 20, border: "1px solid #eadfce", borderRadius: 18, background: "#fffdf9", boxShadow: "0 18px 36px rgba(42, 31, 20, 0.12)", padding: 10, display: "flex", flexDirection: "column", gap: 6, maxHeight: isMobile ? 260 : 320, overflowY: "auto" }}>
      {classes.map((item) => {
        const checked = selectedClassIds.includes(String(item.id));
        return (
          <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, background: checked ? "#f4f0e9" : "transparent", color: "#2a1f14", cursor: "pointer", fontSize: 14, fontWeight: checked ? 700 : 500 }}>
            <input type="checkbox" checked={checked} onChange={() => toggleClassSelection(item.id)} />
            <span>{item.className || item.name || "未命名班级"}</span>
          </label>
        );
      })}
    </div>
  );
}

function ClassSelectionField(props) {
  const {
    detail,
    allowClassSelection,
    actionLoading,
    classes,
    selectedClassNames,
    assignment,
    showClassPicker,
    setShowClassPicker,
    isEditable,
    isMobile,
    selectedClassIds,
    toggleClassSelection,
    showLockedClassHint,
  } = props;

  return (
    <div>
      <div style={{ fontSize: 12, color: "#8a7d6e", marginBottom: 8 }}>{detail?.assignment ? "班级" : "选择班级"}</div>
      <div style={{ position: "relative" }}>
        <ClassSelectionButton
          allowClassSelection={allowClassSelection}
          actionLoading={actionLoading}
          classes={classes}
          selectedClassNames={selectedClassNames}
          assignment={assignment}
          showClassPicker={showClassPicker}
          setShowClassPicker={setShowClassPicker}
          isEditable={isEditable}
        />
        <ClassPickerDropdown
          showClassPicker={showClassPicker}
          allowClassSelection={allowClassSelection}
          classes={classes}
          isMobile={isMobile}
          selectedClassIds={selectedClassIds}
          toggleClassSelection={toggleClassSelection}
        />
      </div>
      {showLockedClassHint ? (
        <div style={{ marginTop: 8, fontSize: 12, color: "#8a7d6e", lineHeight: 1.7 }}>
          已发布或已关闭任务暂不支持更换班级，如需调整请新建任务。
        </div>
      ) : null}
    </div>
  );
}

function AssignmentTitleField({ form, onChange, isEditable, actionLoading }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: "#8a7d6e", marginBottom: 8 }}>作业标题</div>
      <input aria-label="作业标题" value={form.title} onChange={(e) => onChange("title", e.target.value)} disabled={!isEditable || actionLoading} style={{ ...fieldInputStyle, opacity: isEditable ? 1 : 0.72 }} placeholder="例如：高二议论文周练" />
    </div>
  );
}

function AssignmentRecordInfo({ row, assignment }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 14, fontWeight: 800, color: "#2a1f14" }}>
        <span>{row.studentName || "未命名学生"}</span>
        {row.isPendingRoster ? (
          <span style={{ fontSize: 11, color: "#8b5e1a", background: "#fff7ed", border: "1px solid #ead8c7", borderRadius: 999, padding: "2px 8px" }}>待绑定</span>
        ) : null}
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: "#8a7d6e", lineHeight: 1.7 }}>
        {row.className || assignment.className || "未关联班级"} · {row.writingTitle || "未命名写作"}
        {row.latestScore != null ? ` · ${row.latestScore}/${row.maxScore || assignment.maxScore || 15} 分` : ""}
      </div>
      {row.isPendingRoster ? (
        <div style={{ marginTop: 4, fontSize: 12, color: "#a09080", lineHeight: 1.7 }}>
          绑定账号后会自动归入该学生作业记录。
        </div>
      ) : null}
    </div>
  );
}

function AssignmentRecordStatus({ row, isMobile }) {
  return (
    <span style={{ justifySelf: isMobile ? "start" : "end", fontSize: 12, fontWeight: 800, color: row.isPendingRoster ? "#8b5e1a" : (row.workflowStatus === "awaiting_teacher_review" ? "#8b5e1a" : "#2d7a4b"), background: row.isPendingRoster ? "#fff7ed" : (row.workflowStatus === "awaiting_teacher_review" ? "#fdf0d8" : "#f0fdf4"), borderRadius: 999, padding: "5px 10px", whiteSpace: "nowrap" }}>
      {row.workflowLabel || row.statusLabel || "待处理"}
    </span>
  );
}

function AssignmentRecordRow({ row, assignment, isMobile }) {
  return (
    <div style={{ border: "1px solid #ece6de", borderRadius: 16, padding: "12px 14px", background: row.isPendingRoster ? "#fffaf2" : "#fffdf9", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1fr) auto", gap: 10, alignItems: "center" }}>
      <AssignmentRecordInfo row={row} assignment={assignment} />
      <AssignmentRecordStatus row={row} isMobile={isMobile} />
    </div>
  );
}

export function AssignmentBasicsSection({
  SectionCard,
  isMobile = false,
  classes = [],
  selectedClassNames = [],
  selectedClassIds = [],
  showClassPicker = false,
  setShowClassPicker,
  toggleClassSelection,
  actionLoading = false,
  form,
  onChange,
  detail,
  isEditable = true,
  assignment = null,
}) {
  const allowClassSelection = isEditable && (!assignment || assignment.status === "draft");
  const showLockedClassHint = Boolean(assignment) && !allowClassSelection;

  return (
    <SectionCard title="基本信息">
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 14 }}>
        <ClassSelectionField
          detail={detail}
          allowClassSelection={allowClassSelection}
          actionLoading={actionLoading}
          classes={classes}
          selectedClassNames={selectedClassNames}
          assignment={assignment}
          showClassPicker={showClassPicker}
          setShowClassPicker={setShowClassPicker}
          isEditable={isEditable}
          isMobile={isMobile}
          selectedClassIds={selectedClassIds}
          toggleClassSelection={toggleClassSelection}
          showLockedClassHint={showLockedClassHint}
        />
        <AssignmentTitleField form={form} onChange={onChange} isEditable={isEditable} actionLoading={actionLoading} />
      </div>
    </SectionCard>
  );
}

export function AssignmentPromptSection({
  SectionCard,
  ContentModeSwitch,
  QuestionBrowserFallback,
  QuestionSourceBrowser,
  questions = [],
  form,
  onChange,
  onPickQuestion,
  isEditable = true,
  actionLoading = false,
  contentMode,
  onChangeContentMode,
  isMobile = false,
}) {
  return (
    <SectionCard title="题目内容">
      {isEditable ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <ContentModeSwitch value={contentMode} onChange={onChangeContentMode} disabled={actionLoading} />
          {contentMode === "manual" ? (
            <textarea aria-label="题目内容" value={form.promptText} onChange={(e) => onChange("promptText", e.target.value)} disabled={actionLoading} rows={isMobile ? 6 : 8} style={{ ...fieldInputStyle, minHeight: 180, resize: "vertical" }} placeholder="输入题目、写作要求、要点提示等" />
          ) : (
            <Suspense fallback={<QuestionBrowserFallback />}>
              <QuestionSourceBrowser questions={questions} selectedQuestionId={form.questionId} onSelectQuestion={onPickQuestion} title="" subtitle="" emptyText="当前没有可用题目" isMobile={isMobile} />
            </Suspense>
          )}
        </div>
      ) : (
        <textarea aria-label="题目内容" value={form.promptText} disabled rows={isMobile ? 6 : 8} style={{ ...fieldInputStyle, minHeight: 180, resize: "vertical", opacity: 0.72 }} />
      )}
    </SectionCard>
  );
}

export function AssignmentPublishSettingsSection({
  SectionCard,
  isMobile = false,
  form,
  onChange,
  isEditable = true,
  actionLoading = false,
}) {
  return (
    <SectionCard title="发布设置">
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 14 }}>
        <div>
          <div style={{ fontSize: 12, color: "#8a7d6e", marginBottom: 8 }}>满分</div>
          <input aria-label="满分" type="number" min="1" value={form.maxScore} onChange={(e) => onChange("maxScore", e.target.value)} disabled={!isEditable || actionLoading} style={{ ...fieldInputStyle, opacity: isEditable ? 1 : 0.72 }} />
        </div>
        <div>
          <div style={{ fontSize: 12, color: "#8a7d6e", marginBottom: 8 }}>截止时间</div>
          <input aria-label="截止时间" type="datetime-local" value={form.dueAt} onChange={(e) => onChange("dueAt", e.target.value)} disabled={!isEditable || actionLoading} style={{ ...fieldInputStyle, opacity: isEditable ? 1 : 0.72 }} />
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid #eadfce", borderRadius: 16, background: "#fffdf9", padding: "12px 14px", color: "#2a1f14", opacity: isEditable ? 1 : 0.72 }}>
          <input type="checkbox" checked={Boolean(form.allowLate)} onChange={(e) => onChange("allowLate", e.target.checked)} disabled={!isEditable || actionLoading} />
          <span style={{ fontSize: 13 }}>允许逾期补交</span>
        </label>
      </div>
    </SectionCard>
  );
}

export function AssignmentRecordsSection({
  SectionCard,
  submissionRows = [],
  summaryHint = "",
  assignment = {},
  isMobile = false,
}) {
  return (
    <>
      <div style={{ marginTop: -2, marginBottom: 14, fontSize: 12, color: "#8a7d6e", lineHeight: 1.7 }}>
        {summaryHint}
      </div>
      <SectionCard title="批改记录">
        {submissionRows.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {submissionRows.slice(0, 12).map((row) => (
              <AssignmentRecordRow key={`${row.recordType}-${row.id}`} row={row} assignment={assignment} isMobile={isMobile} />
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#8a7d6e", lineHeight: 1.7 }}>暂无批改记录。</div>
        )}
      </SectionCard>
    </>
  );
}
