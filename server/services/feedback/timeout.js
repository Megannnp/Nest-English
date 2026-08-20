export function withTimeout(promise, ms, label) {
  let timer = null;
  return Promise.race([
    promise.finally(() => {
      if (timer) clearTimeout(timer);
    }),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(label)), ms);
    }),
  ]);
}

export function trimMiddle(text, maxLength) {
  const normalized = String(text || '').trim();
  if (!normalized || normalized.length <= maxLength) return normalized;
  const headLength = Math.max(0, Math.floor(maxLength * 0.65));
  const tailLength = Math.max(0, maxLength - headLength - 9);
  return `${normalized.slice(0, headLength)}\n\n...[中间内容已省略]...\n\n${normalized.slice(-tailLength)}`;
}
