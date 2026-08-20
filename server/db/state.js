export const dbHealth = {
  ready: false,
  initializing: false,
  error: null,
  lastCheckedAt: null,
};

export function markDatabasePending(reason = '数据库初始化尚未启动') {
  dbHealth.ready = false;
  dbHealth.initializing = false;
  dbHealth.error = reason;
  dbHealth.lastCheckedAt = Date.now();
}

export function markDatabaseInitializing() {
  dbHealth.initializing = true;
  dbHealth.error = null;
  dbHealth.lastCheckedAt = Date.now();
}

export function markDatabaseReady() {
  dbHealth.ready = true;
  dbHealth.initializing = false;
  dbHealth.error = null;
  dbHealth.lastCheckedAt = Date.now();
}

export function markDatabaseSkipped(reason) {
  dbHealth.ready = false;
  dbHealth.initializing = false;
  dbHealth.error = reason;
  dbHealth.lastCheckedAt = Date.now();
}

export function markDatabaseFailed(message) {
  dbHealth.ready = false;
  dbHealth.initializing = false;
  dbHealth.error = message;
  dbHealth.lastCheckedAt = Date.now();
}
