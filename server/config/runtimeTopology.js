function isDevEnv(env = process.env) {
  return env.NODE_ENV !== 'production';
}

function parseRuntimeRole(rawRole, defaultRole = 'all') {
  const normalized = String(rawRole || '').trim().toLowerCase();
  if (['all', 'api', 'worker'].includes(normalized)) {
    return normalized;
  }
  return defaultRole;
}

function parseBinaryFlag(value, fallback) {
  if (value === '1' || value === 1 || value === true) return true;
  if (value === '0' || value === 0 || value === false) return false;
  return fallback;
}

function resolveEmbeddedWorkerFlags(env = process.env) {
  const runtimeRole = parseRuntimeRole(env.NEST_RUNTIME_ROLE, 'all');
  const allowEmbeddedByDefault = runtimeRole === 'all';
  const dev = isDevEnv(env);

  return {
    questionAnalysis: parseBinaryFlag(
      env.QUESTION_ANALYSIS_EMBEDDED_WORKER,
      allowEmbeddedByDefault && dev
    ),
    feedback: parseBinaryFlag(
      env.FEEDBACK_EMBEDDED_WORKER,
      allowEmbeddedByDefault
    ),
    batchGrading: parseBinaryFlag(
      env.BATCH_GRADING_EMBEDDED_WORKER,
      allowEmbeddedByDefault
    ),
    examImport: parseBinaryFlag(
      env.EXAM_IMPORT_EMBEDDED_WORKER,
      allowEmbeddedByDefault
    ),
  };
}

function resolveWorkerMode(embeddedWorkers) {
  const values = Object.values(embeddedWorkers);
  if (values.every(Boolean)) return 'embedded';
  if (values.some(Boolean)) return 'mixed';
  return 'external';
}

export function getRuntimeTopology(env = process.env) {
  const runtimeRole = parseRuntimeRole(env.NEST_RUNTIME_ROLE, 'all');
  const embeddedWorkers = resolveEmbeddedWorkerFlags(env);

  return {
    runtimeRole,
    workerMode: resolveWorkerMode(embeddedWorkers),
    embeddedWorkers,
    externalWorkerEntrypoints: {
      runtime: 'npm run worker:runtime --prefix server',
      questionAnalysisOnly: 'npm run worker:question-analysis --prefix server',
    },
  };
}

export function getApiEmbeddedWorkerFlags(env = process.env) {
  const topology = getRuntimeTopology(env);
  if (topology.runtimeRole !== 'all') {
    return {
      questionAnalysis: false,
      feedback: false,
      batchGrading: false,
      examImport: false,
    };
  }
  return topology.embeddedWorkers;
}

export function getWorkerRuntimeFlags() {
  return {
    questionAnalysis: true,
    feedback: true,
    batchGrading: true,
    examImport: true,
  };
}

