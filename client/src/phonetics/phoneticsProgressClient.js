import { phoneticsAPI } from "../api/index.js";

export function recordPhoneticsProgress(user, payload) {
  if (!user?.id) return;
  phoneticsAPI.recordProgress({
    score: 100,
    accuracy: 100,
    ...payload,
  }).catch(() => {
    window.dispatchEvent?.(new CustomEvent("nest:phonetics-record-failed", {
      detail: "练习记录保存失败，语音成长页可能暂未更新。",
    }));
  });
}
