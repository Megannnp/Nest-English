export function getAssignmentStatusLabel(status) {
  switch (status) {
    case "published":
      return "已发布";
    case "closed":
      return "已关闭";
    case "archived":
      return "已归档";
    case "draft":
    default:
      return "草稿";
  }
}

export function getWritingRiskFlags(item) {
  const summaryText = [item?.quickSummary, item?.errorMessage]
    .filter(Boolean)
    .join(" ");
  const isOffTopic = /偏题|跑题|离题/.test(summaryText);
  const totalScore = Number(item?.totalScore ?? 0);
  const maxScore = Number(item?.maxScore ?? 0);
  const isHighRisk = isOffTopic || (maxScore > 0 && totalScore / maxScore < 0.6);
  return { isOffTopic, isHighRisk };
}
