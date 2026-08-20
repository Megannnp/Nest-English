import AppIcon from "./AppIcon.jsx";
import PageHero from "./PageHero.jsx";
import useScrollReveal from "../../hooks/useScrollReveal.js";
import "./moduleLearningPages.css";

function WorkbenchStat({ label, value, helper }) {
  return (
    <div className="module-workbench-stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </div>
  );
}

function WorkbenchPanel({ title, children }) {
  return (
    <section className="module-workbench-panel studio-reveal studio-reveal--delay-1">
      <div className="module-workbench-panel__head">
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SuggestionsPanel({ suggestions, dataConnected, emptyMessage }) {
  return (
    <WorkbenchPanel title="下一步建议">
      <div className="module-workbench-todo">
        {suggestions.length > 0 ? suggestions.map((item, index) => (
          <p key={item}>{index + 1}. {item}</p>
        )) : (
          <p>{dataConnected ? "有真实班级数据后会生成建议。" : emptyMessage}</p>
        )}
      </div>
    </WorkbenchPanel>
  );
}

function ClassRowsPanel({ classRows, dataConnected, emptyMessage, emptyTitle }) {
  return (
    <WorkbenchPanel title="班级学习概览">
      <div className="module-class-list">
        {classRows.length > 0 ? classRows.map((item) => (
          <div key={item.name} className="module-class-row">
            <span><AppIcon name="classes" size={18} /></span>
            <div>
              <strong>{item.name}</strong>
              <p>{item.progress} 已完成 · 重点：{item.focus}</p>
            </div>
          </div>
        )) : (
          <div className="module-workbench-empty module-workbench-empty--panel">
            <strong>{dataConnected ? "暂无学习记录" : emptyTitle}</strong>
            <p>{emptyMessage}</p>
          </div>
        )}
      </div>
    </WorkbenchPanel>
  );
}

export default function ModuleWorkbenchPage({
  topBar,
  moduleName,
  title,
  subtitle,
  onNavigate,
  actions = [],
  stats = [],
  classRows = [],
  suggestions = [],
  controls = null,
  dataConnected = true,
  emptyTitle = "暂无班级数据",
  emptyMessage = "学生产生学习记录后，这里会显示班级进度。",
  pageClass = "",
  extraSection = null,
}) {
  const pageRef = useScrollReveal();
  const hasStats = stats.length > 0;

  return (
    <div className={`module-learning-page${pageClass ? ` ${pageClass}` : ""}`} ref={pageRef}>
      {topBar}
      <main className="module-workbench-page">
        <PageHero eyebrow={`${moduleName} · 教师工作台`} title={title} description={subtitle} />

        <div className="module-workbench-actions studio-reveal studio-reveal--delay-1">
          {actions.map((item, index) => (
            <button
              key={item.label}
              type="button"
              className={index === 0 ? "gm-btn-primary" : "gm-btn-secondary"}
              onClick={() => onNavigate?.(item.page)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {controls ? (
          <div className="studio-reveal studio-reveal--delay-1">
            {controls}
          </div>
        ) : null}

        {hasStats ? (
          <section className="module-workbench-stats studio-reveal studio-reveal--delay-1">
            {stats.map((item) => <WorkbenchStat key={item.label} {...item} />)}
          </section>
        ) : (
          <section className="module-workbench-empty studio-reveal studio-reveal--delay-1">
            <strong>{emptyTitle}</strong>
            <p>{emptyMessage}</p>
          </section>
        )}

        <div className="module-workbench-grid">
          <ClassRowsPanel classRows={classRows} dataConnected={dataConnected} emptyMessage={emptyMessage} emptyTitle="数据待接入" />
          <SuggestionsPanel suggestions={suggestions} dataConnected={dataConnected} emptyMessage="当前模块尚未接入教师端统计接口，不展示推断建议。" />
        </div>

        {extraSection ? (
          <div className="studio-reveal studio-reveal--delay-1" style={{ marginTop: 8 }}>
            {extraSection}
          </div>
        ) : null}
      </main>
    </div>
  );
}
