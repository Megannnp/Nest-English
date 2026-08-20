export function formatCampDate(timestamp) {
  if (!timestamp) return "时间待定";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

export function getCourseIdFromPath(pattern) {
  if (typeof window === "undefined") return "";
  const match = window.location.pathname.match(pattern);
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

export function canUseCampMockPayment(env = import.meta.env) {
  return Boolean(env?.DEV);
}

export function shouldShowCampDemoCode(env = import.meta.env) {
  return Boolean(env?.DEV);
}

export function getCampCourseActionLabel(course, mockPaymentEnabled = canUseCampMockPayment()) {
  if (course?.enrolled) return "进入学习";
  if (course?.status === "coming_soon") return "即将开课";
  if (!mockPaymentEnabled) return "使用兑换码";
  return "立即报名";
}

export function openExternalLive(url) {
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
