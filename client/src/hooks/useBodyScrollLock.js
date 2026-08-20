import { useEffect } from "react";

/**
 * 弹窗打开时锁定 body 滚动，关闭时自动恢复。
 * @param {boolean} locked - 是否锁定
 */
export default function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}
