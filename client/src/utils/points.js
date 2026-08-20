import { usersAPI } from "../api/index.js";

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function recordLearningPoints(user, module, idempotencyKey, metadata = {}) {
  if (!user?.id || !module || !idempotencyKey) return;
  usersAPI.recordLearningEvent({
    module,
    eventType: "complete",
    idempotencyKey,
    metadata,
  }).then(() => {
    window.dispatchEvent(new CustomEvent("nest:module-complete", { detail: { module } }));
  }).catch(() => {
    // Points should never interrupt the learning flow.
  });
}
