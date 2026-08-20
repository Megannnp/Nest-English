export function fmtDateTime(value) {
  if (!value) return '暂无';
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function fmtNumber(value) {
  return Number(value || 0).toLocaleString('zh-CN');
}

export function budgetUsageLabel(status) {
  if (status === 'exceeded') return '已超额';
  if (status === 'warning') return '接近上限';
  return '正常';
}
