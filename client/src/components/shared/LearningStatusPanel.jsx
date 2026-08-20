import "./learningStatusPanel.css";

function clampPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

export default function LearningStatusPanel({
  className = "",
  tasks = [],
  abilities = [],
  records = [],
  quota,
  actionLabel = "查看会员权益",
  onAction,
}) {
  const safeTasks = tasks.slice(0, 4);
  const safeAbilities = abilities.slice(0, 4);
  const safeRecords = records.slice(0, 6);
  const average = safeAbilities.length
    ? Math.round(safeAbilities.reduce((sum, item) => sum + clampPercent(item.value), 0) / safeAbilities.length)
    : 0;

  return (
    <section className={`learning-status studio-reveal ${className}`.trim()} aria-label="学习状态">
      <article className="learning-status__card">
        <div className="learning-status__head">
          <span>今日任务</span>
          <strong>{safeTasks.length}</strong>
        </div>
        <div className="learning-status__tasks">
          {safeTasks.map((task, index) => (
            <div key={task} className="learning-status__task">
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{task}</p>
            </div>
          ))}
        </div>
      </article>

      <article className="learning-status__card">
        <div className="learning-status__head">
          <span>能力雷达</span>
          <strong>{average}</strong>
        </div>
        <div className="learning-status__abilities">
          {safeAbilities.map((item) => {
            const value = clampPercent(item.value);
            return (
              <div key={item.label} className="learning-status__ability">
                <div>
                  <span>{item.label}</span>
                  <strong>{value}</strong>
                </div>
                <i><b style={{ width: `${value}%` }} /></i>
              </div>
            );
          })}
        </div>
      </article>

      <article className="learning-status__card">
        <div className="learning-status__head">
          <span>训练记录</span>
          <strong>{safeRecords.length}</strong>
        </div>
        <div className="learning-status__records">
          {safeRecords.map((record) => (
            <span key={record}>{record}</span>
          ))}
        </div>
        {quota && <p className="learning-status__quota">{quota}</p>}
        {onAction && (
            <button type="button" className="learning-status__action" aria-label={actionLabel} onClick={onAction}>
            {actionLabel}
          </button>
        )}
      </article>
    </section>
  );
}
