export function getErrorMessage(error, fallback = '请求失败，请稍后重试') {
  if (typeof error === 'string') return error;
  return error?.message || fallback;
}

const REQUEST_STATE_RULES = [
  {
    matches(error, message) {
      return error?.networkError || message.includes('网络连接失败');
    },
    state: {
      tone: 'error',
      title: '网络连接失败',
      description: '当前无法连到服务器。请先检查网络连接，再重新发起操作。',
    },
  },
  {
    matches(error, message) {
      return error?.timeout || message.includes('请求超时') || message.includes('下载超时');
    },
    state: {
      tone: 'warning',
      title: '请求超时',
      description: '服务器响应时间有点长。可以稍等片刻后重试，避免连续重复点击。',
    },
  },
  {
    matches(error) {
      return error?.type === 'response_parse_failed';
    },
    state: {
      tone: 'warning',
      title: '服务响应异常',
      description: '服务器返回了无法正常解析的内容。建议稍后重试；如果持续出现，请检查服务日志或网关配置。',
    },
  },
  {
    matches(error) {
      return error?.statusCode === 403 || error?.forbidden;
    },
    state: {
      tone: 'warning',
      title: '当前没有权限执行这个操作',
      description: '请确认你使用的是正确账号，或当前内容确实属于你可访问的班级、作文或管理范围。',
    },
  },
  {
    matches(error) {
      return error?.statusCode === 503 || error?.serviceUnavailable;
    },
    state: {
      tone: 'warning',
      title: '服务暂时不可用',
      description: '服务器或上游 AI 服务当前不可用。建议稍后再试，不需要频繁重复提交。',
    },
  },
];

function isPrebuiltRequestState(error) {
  return typeof error === 'object' && error?.title && error?.description && error?.tone;
}

function findMatchingRequestState(error, message) {
  const matchedRule = REQUEST_STATE_RULES.find((rule) => rule.matches(error, message));
  return matchedRule?.state || null;
}

function buildGenericRequestState(message, options) {
  const {
    genericTitle = '这次请求没有成功',
    genericDescription = '请稍后重试；如果问题持续出现，再检查网络、账号权限或服务状态。',
  } = options;

  return {
    tone: 'error',
    title: genericTitle,
    description: `${genericDescription}${message ? ` 当前提示：${message}` : ''}`,
  };
}

export function getRequestStateFromError(error, options = {}) {
  if (!error) return null;
  if (isPrebuiltRequestState(error)) return error;

  const message = getErrorMessage(error);
  return findMatchingRequestState(error, message) || buildGenericRequestState(message, options);
}
