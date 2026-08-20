/* eslint-disable complexity */
import AppIcon from "./AppIcon.jsx";
import PageHero from "./PageHero.jsx";
import useScrollReveal from "../../hooks/useScrollReveal.js";
import "./moduleLearningPages.css";

function MetricCard({ label, value, helper }) {
  return (
    <div className="module-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{helper}</p>
    </div>
  );
}

function SkillRow({ label, value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return (
    <div className="module-skill">
      <div>
        <span>{label}</span>
        <strong>{safeValue}%</strong>
      </div>
      <div className="module-skill__bar">
        <i style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

function ActionBlock({ icon = "zap", title, desc, onClick }) {
  return (
    <button type="button" className="module-action" onClick={onClick}>
      <span className="module-action__icon"><AppIcon name={icon} size={20} /></span>
      <span>
        <strong>{title}</strong>
        <em>{desc}</em>
      </span>
      <b aria-hidden="true">→</b>
    </button>
  );
}

function defaultRenderItem(record) {
  return { key: record.key ?? record.id, tag: record.tag, title: record.title, meta: record.meta, onClick: record.onClick };
}

export function RecentRecordsList({ title = "最近记录", records = [], actionLabel, onAction, renderItem = defaultRenderItem }) {
  if (!records.length) return null;
  return (
    <div className="module-recent-list">
      <div className="module-recent-list__head">
        <strong>{title}</strong>
        {actionLabel ? <button type="button" aria-label={actionLabel} onClick={onAction}>{actionLabel}</button> : null}
      </div>
      {records.map((record, index) => {
        const item = renderItem(record, index);
        const Tag = item.onClick ? "button" : "div";
        return (
          <Tag className="module-recent-item" key={item.key ?? index} onClick={item.onClick} type={item.onClick ? "button" : undefined}>
            <span>{item.tag}</span>
            <strong>{item.title}</strong>
            <em>{item.meta}</em>
          </Tag>
        );
      })}
    </div>
  );
}

function resolvePageClass(pageClass) {
  return `module-learning-page${pageClass ? ` ${pageClass}` : ""}`;
}

function resolveGrowthHeading({ user, displayName }) {
  return user ? `${displayName} 的学习成长` : "学习成长示例";
}

function resolveDataLabel({ dataLabel, user }) {
  if (dataLabel) return dataLabel;
  return user ? "实时记录" : "示例数据";
}

function EmptyGrowthState({ message }) {
  return (
    <div className="module-growth-empty" role="status">
      {message}
    </div>
  );
}

function ErrorGrowthState({ message, onRetry }) {
  return (
    <div className="module-growth-empty module-growth-empty--error" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button type="button" className="gm-btn-secondary" onClick={onRetry}>重新加载</button>
      ) : null}
    </div>
  );
}

function resolveCardState({ user, loading, error, dataConnected, hasData, metrics, skills }) {
  if (loading) return "loading";
  if (error && user) return "error";
  if (Boolean(user) && !dataConnected) return "disconnected";
  if (Boolean(user) && dataConnected && hasData === false) return "empty";
  if (dataConnected && metrics.length === 0 && skills.length === 0) return "empty";
  return "data";
}

export default function ModuleGrowthPage({
  title,
  subtitle,
  user,
  onNavigate,
  metrics = [],
  skills = [],
  actions = [],
  pageClass = "",
  dataLabel,
  dataConnected = true,
  loading = false,
  error = "",
  onRetry,
  hasData,
  emptyMessage = "真实成长数据接入后会显示在这里。",
  children,
}) {
  const pageRef = useScrollReveal();
  const displayName = user?.realName || user?.name || "同学";
  const cardState = resolveCardState({ user, loading, error, dataConnected, hasData, metrics, skills });

  return (
    <div className={resolvePageClass(pageClass)} ref={pageRef}>
      <main className="module-progress-page">
        <PageHero title={title} description={subtitle} />

        <section className="module-growth-card studio-reveal studio-reveal--delay-1">
          <div className="module-growth-card__head">
            <div>
              <p>Learning Growth</p>
              <h2>{resolveGrowthHeading({ user, displayName })}</h2>
            </div>
            <span>{cardState === "disconnected" ? "数据待接入" : resolveDataLabel({ dataLabel, user })}</span>
          </div>

          {cardState === "loading" ? (
            <EmptyGrowthState message="加载中…" />
          ) : cardState === "error" ? (
            <ErrorGrowthState message={error} onRetry={onRetry} />
          ) : cardState === "disconnected" || cardState === "empty" ? (
            <EmptyGrowthState message={emptyMessage} />
          ) : (
            <>
              <div className="module-metrics">
                {metrics.map((item) => <MetricCard key={item.label} {...item} />)}
              </div>

              <div className="module-skill-list">
                {skills.map((skill) => <SkillRow key={skill.label} {...skill} />)}
              </div>

              {children}
            </>
          )}
        </section>

        <section className="module-actions studio-reveal studio-reveal--delay-2">
          {actions.map((item) => (
            <ActionBlock
              key={item.title}
              {...item}
              onClick={() => onNavigate?.(item.page)}
            />
          ))}
        </section>
      </main>
    </div>
  );
}
