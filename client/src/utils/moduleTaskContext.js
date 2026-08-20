export const MODULE_TASK_STORAGE_KEY = "nest_module_task_context";

const MODULE_TASK_TTL_MS = 30 * 60 * 1000;

export function writeModuleTaskContext(task) {
  if (typeof window === "undefined" || !task) return;
  window.sessionStorage.setItem(MODULE_TASK_STORAGE_KEY, JSON.stringify({
    ...task,
    moduleTaskLaunchedAt: Date.now(),
  }));
}

export function clearModuleTaskContext() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(MODULE_TASK_STORAGE_KEY);
}

export function readModuleTaskContext(entryPage) {
  if (typeof window === "undefined") return null;
  try {
    const task = JSON.parse(window.sessionStorage.getItem(MODULE_TASK_STORAGE_KEY) || "null");
    const launchedAt = Number(task?.moduleTaskLaunchedAt || 0);
    if (!task || task.taskType !== "module" || task.assignment?.entryPage !== entryPage) return null;
    if (!launchedAt || Date.now() - launchedAt > MODULE_TASK_TTL_MS) {
      clearModuleTaskContext();
      return null;
    }
    return task;
  } catch {
    clearModuleTaskContext();
    return null;
  }
}
