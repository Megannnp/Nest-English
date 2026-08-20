import {
  ClassSummaryReport,
  EssayCard,
  RecentBatchJobsPanel,
} from './batch-grading/BatchGradingPageSections.jsx';
import { STATUS, SELECT_ARROW, THEME } from './batch-grading/shared.js';
import { useBatchGradingModel } from './batch-grading/useBatchGradingModel.js';
import { exportBatchFeedbackPdf } from '../components/batch-feedback-pdf-export.js';
import AppIcon from '../components/shared/AppIcon.jsx';
import { BackHomeButton, PageHeader } from '../components/shared/UI.jsx';
import { SURFACE_SPACING } from '../constants/index.jsx';

function Panel({ children, isMobile, style }) {
  return (
    <section
      style={{
        background: THEME.card,
        borderRadius: 14,
        border: `1px solid ${THEME.border}`,
        padding: isMobile ? 14 : 20,
        marginBottom: SURFACE_SPACING.stack,
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function SelectField({ label, value, onChange, children, disabled = false }) {
  return (
    <label style={{ display: 'grid', gap: 6, fontSize: 12, color: THEME.textMuted, flex: 1, minWidth: 180 }}>
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '9px 40px 9px 12px',
          borderRadius: 10,
          border: `1px solid ${THEME.border}`,
          fontSize: 13,
          color: disabled ? THEME.textMuted : THEME.text,
          background: disabled ? '#f5f3f0' : THEME.card,
          ...SELECT_ARROW,
        }}
      >
        {children}
      </select>
    </label>
  );
}

function ReadOnlyField({ label, value, placeholder }) {
  return (
    <label style={{ display: 'grid', gap: 6, fontSize: 12, color: THEME.textMuted, flex: 1, minWidth: 180 }}>
      {label}
      <div
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: '9px 12px',
          borderRadius: 10,
          border: `1px solid ${THEME.border}`,
          fontSize: 13,
          color: value ? THEME.text : THEME.textMuted,
          background: '#f5f3f0',
          minHeight: 38,
        }}
      >
        {value || placeholder}
      </div>
    </label>
  );
}

function FileDropZone({ canUpload, isDragOver, isMobile, fileRef, onDragOver, onDragLeave, onDrop, onAddFiles }) {
  return (
    <div
      onDragOver={canUpload ? onDragOver : undefined}
      onDragLeave={canUpload ? onDragLeave : undefined}
      onDrop={canUpload ? onDrop : undefined}
      style={{
        border: `2px dashed ${isDragOver ? THEME.primary : THEME.border}`,
        borderRadius: 14,
        padding: isMobile ? '24px 16px' : '34px 24px',
        textAlign: 'center',
        cursor: canUpload ? 'default' : 'not-allowed',
        background: isDragOver ? THEME.primaryLight : THEME.cardAlt,
        opacity: canUpload ? 1 : 0.68,
      }}
    >
      <input ref={fileRef} type="file" accept="image/*" multiple disabled={!canUpload} style={{ display: 'none' }} onChange={(event) => onAddFiles(event.target.files)} />
      <div style={{ fontSize: 32, marginBottom: 8 }}><AppIcon name="folder-open" size={36} /></div>
      <div style={{ fontSize: isMobile ? 14 : 15, fontWeight: 800, color: THEME.text, marginBottom: 4 }}>
        {canUpload ? (isMobile ? '点击上传作文图片' : '点击或拖拽上传作文图片') : '请先选择关联任务'}
      </div>
      <button type="button" onClick={() => fileRef.current?.click()} disabled={!canUpload} style={{ marginTop: 8, border: `1px solid ${THEME.border}`, borderRadius: 999, background: THEME.card, color: THEME.textMuted, fontSize: 13, padding: '6px 14px', cursor: canUpload ? 'pointer' : 'not-allowed' }}>
        选择图片
      </button>
      <div style={{ fontSize: 12, color: THEME.textMuted }}>
        {canUpload ? '支持批量选择，每张图片对应一位学生。' : '批量批改会写回任务进度，因此必须先选任务。'}
      </div>
    </div>
  );
}

function BatchSetupPanel({ model, isMobile }) {
  const canUpload = Boolean(model.selectedAssignmentId);
  const lockScope = model.items.length > 0 || model.isRunning;

  return (
    <Panel isMobile={isMobile}>
      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.primaryDark, marginBottom: 12 }}>批改设置</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <SelectField label="班级" value={model.selectedClassId} onChange={model.handleSelectClass} disabled={lockScope}>
          <option value="">选择班级</option>
          {model.classes.map((cls) => (
            <option key={cls.id} value={cls.id}>{cls.className || cls.name || '未命名班级'}</option>
          ))}
        </SelectField>
        {model.classesError ? (
          <div style={{ width: '100%', fontSize: 12, color: THEME.error }}>{model.classesError}</div>
        ) : null}
        <SelectField
          label="关联任务"
          value={model.selectedAssignmentId}
          onChange={model.handleSelectAssignment}
          disabled={!model.selectedClassId || lockScope}
        >
          <option value="" disabled>{model.selectedClassId ? '请选择任务' : '先选择班级'}</option>
          {model.assignments.map((assignment) => (
            <option key={assignment.id} value={assignment.id}>{assignment.title || assignment.promptText?.slice(0, 40) || '未命名任务'}</option>
          ))}
        </SelectField>
        <ReadOnlyField
          label="题目"
          value={model.selectedQuestion?.title || model.selectedAssignment?.title || ''}
          placeholder="由任务自动带出"
        />
      </div>
      {lockScope ? (
        <div style={{ marginBottom: 14, fontSize: 12, color: THEME.textMuted, lineHeight: 1.7 }}>
          已上传作文后会锁定班级和任务；如需更换，请先清空当前批次。
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 6, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: THEME.textMuted }}>题目内容</div>
        <div style={{ minHeight: 64, padding: '10px 12px', borderRadius: 10, border: `1px solid ${THEME.border}`, background: '#fffdf9', color: model.promptText ? THEME.text : THEME.textMuted, fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
          {model.promptText || '选择任务后会自动带出题目。'}
        </div>
      </div>

      <FileDropZone
        canUpload={canUpload}
        isDragOver={model.isDragOver}
        isMobile={isMobile}
        fileRef={model.fileRef}
        onDragOver={model.handleDragOver}
        onDragLeave={model.handleDragLeave}
        onDrop={model.handleDropFiles}
        onAddFiles={model.addFiles}
      />
    </Panel>
  );
}

function BatchActions({ model, isMobile }) {
  const hasItems = model.items.length > 0;
  if (!hasItems) return null;

  const actionStyle = (enabled = true, tone = 'primary') => ({
    padding: isMobile ? '10px 16px' : '11px 22px',
    borderRadius: 999,
    border: tone === 'danger' ? '1px solid #fca5a5' : `1px solid ${THEME.primary}`,
    background: !enabled ? '#d6d3d1' : tone === 'danger' ? THEME.errorLight : THEME.primaryLight,
    color: !enabled ? '#fff' : tone === 'danger' ? THEME.error : THEME.primaryDark,
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontSize: 13,
    fontWeight: 800,
  });

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: SURFACE_SPACING.stack }}>
      {model.phase === 'setup' ? (
        <button type="button" onClick={model.runOCR} disabled={model.isRunning || !model.selectedAssignmentId} style={actionStyle(!model.isRunning && Boolean(model.selectedAssignmentId))}>
          <AppIcon name="search" size={14} style={{ verticalAlign: 'middle', marginRight: 5 }} />开始识别姓名
        </button>
      ) : null}
      {model.phase === 'confirm' && !model.isRunning ? (
        <>
          <button type="button" onClick={model.confirmAll} disabled={!model.canConfirmAll} style={actionStyle(model.canConfirmAll)}>
            一键确认
          </button>
          <button type="button" onClick={model.fillUnmatchedByRosterOrder} disabled={!model.canFillByRosterOrder} style={actionStyle(model.canFillByRosterOrder)}>
            按名单顺序填充
          </button>
          <button type="button" onClick={() => model.runGrading()} disabled={!model.canStartGrading} style={actionStyle(model.canStartGrading)}>
            ✨ 开始批量批改 ({model.items.length} 份)
          </button>
        </>
      ) : null}
      {model.phase === 'grading' ? (
        <>
          <button type="button" aria-label={model.isPaused ? '继续批量任务' : '暂停批量任务'} onClick={model.isPaused ? model.resumeBatchJob : model.pauseBatchJob} style={actionStyle(true)}>
            {model.isPaused ? '▶ 继续' : '⏸ 暂停'}
          </button>
          <button type="button" onClick={model.cancelBatchJob} style={actionStyle(true, 'danger')}>
            ✕ 停止
          </button>
        </>
      ) : null}
      {model.phase === 'done' && model.errorCount > 0 ? (
        <>
          <button type="button" onClick={model.retryFailedBatchJob} style={actionStyle(true)}>重试失败项</button>
          <button type="button" onClick={model.continueIncompleteBatchJob} style={actionStyle(true)}>继续未完成项</button>
        </>
      ) : null}
      {model.phase === 'done' && model.doneCount > 0 ? (
        <button
          type="button"
          onClick={() => exportBatchFeedbackPdf({
            title: model.selectedAssignment?.title || model.selectedQuestion?.title || '批量反馈',
            items: model.items,
          })}
          style={actionStyle(true)}
        >
          导出反馈条 PDF
        </button>
      ) : null}
    </div>
  );
}

function ItemsPanel({ model, isMobile }) {
  if (model.items.length === 0) return null;

  return (
    <Panel isMobile={isMobile} style={{ padding: isMobile ? 12 : 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: THEME.text }}>
            {model.phase === 'confirm' ? `确认姓名（已确认 ${model.confirmedCount}/${model.items.length}）` : `共 ${model.items.length} 份`}
          </div>
          {model.confirmBlockReason ? <div style={{ marginTop: 3, fontSize: 12, color: THEME.error }}>{model.confirmBlockReason}</div> : null}
        </div>
        <button type="button" onClick={model.clearAllItems} disabled={model.isRunning} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 999, border: `1px solid ${THEME.border}`, background: 'transparent', color: THEME.textMuted, cursor: model.isRunning ? 'not-allowed' : 'pointer' }}>
          清空
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {model.items.map((item, index) => (
          <EssayCard
            key={item.id || item.writingId || index}
            item={item}
            idx={index}
            studentOptions={model.studentOptions}
            onStudentSelect={model.handleStudentSelect}
            onNameChange={(idx, studentName) => model.updateItem(idx, { studentName })}
            onRemove={model.removeItem}
            onRetryOCR={model.retryOCR}
            isMobile={isMobile}
            statusMap={STATUS}
          />
        ))}
      </div>
    </Panel>
  );
}

function ProgressPanel({ model, isMobile }) {
  if (model.phase !== 'grading') return null;
  return (
    <Panel isMobile={isMobile}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: THEME.primaryDark, fontWeight: 800, marginBottom: 10 }}>
        <span>{model.isPaused ? '⏸ 已暂停' : '⏳ 批改中'} {model.doneCount + model.errorCount + model.canceledCount}/{model.items.length}</span>
        <span>{model.progress}%</span>
      </div>
      <div style={{ height: 6, background: THEME.border, borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${model.progress}%`, background: model.isPaused ? '#d1d5db' : `linear-gradient(90deg, ${THEME.primary}, #e8a840)`, borderRadius: 3, transition: 'width 0.4s ease' }}/>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12, flexWrap: 'wrap' }}>
        <span style={{ color: THEME.success }}>✓ {model.doneCount} 份</span>
        {model.errorCount > 0 ? <span style={{ color: THEME.error }}>✕ {model.errorCount} 份</span> : null}
        {model.canceledCount > 0 ? <span style={{ color: THEME.textMuted }}>已停止 {model.canceledCount} 份</span> : null}
        <span style={{ color: '#8b5cf6' }}>剩 {model.incompleteCount} 份</span>
      </div>
    </Panel>
  );
}

export default function BatchGradingPage({ user, questions, studentsInClass = [], onBack, isMobile = false }) {
  const model = useBatchGradingModel({ user, questions, studentsInClass });
  const pageTitle = model.selectedAssignment?.title || model.selectedQuestion?.title || '批量作文批改';

  return (
    <div style={{ minHeight: '100vh', background: THEME.bg, padding: isMobile ? 12 : 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <BackHomeButton onClick={onBack} />
        <PageHeader
          title="批量作文批改"
          subtitle="上传多份作文图片，按班级名单绑定学生，并支持任务接回、暂停、重试与导出。"
          isMobile={isMobile}
        />

        <RecentBatchJobsPanel
          jobs={model.recentJobs}
          loading={model.recentJobsLoading}
          currentJobId={model.currentJobId}
          filter={model.recentJobsFilter}
          classFiltered={Boolean(model.selectedClassId)}
          assignmentFiltered={Boolean(model.selectedAssignmentId)}
          onFilterChange={model.handleRecentJobsFilterChange}
          onRefresh={model.loadRecentBatchJobs}
          onAttach={model.attachBatchJob}
        />

        <BatchSetupPanel model={model} isMobile={isMobile} />
        <ItemsPanel model={model} isMobile={isMobile} />
        <ProgressPanel model={model} isMobile={isMobile} />
        <BatchActions model={model} isMobile={isMobile} />

        {(model.phase === 'grading' || model.phase === 'done') && model.doneCount > 0 ? (
          <ClassSummaryReport items={model.items} questionTitle={pageTitle} isMobile={isMobile} />
        ) : null}
      </div>
    </div>
  );
}
