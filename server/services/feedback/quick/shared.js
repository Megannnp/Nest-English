export const QUICK_FEEDBACK_TIMEOUT_MS = 45000;

export function latestQueuedOrCreatedAt(row, task) {
  return Number(task?.createdAt || row?.created_at || Date.now());
}
