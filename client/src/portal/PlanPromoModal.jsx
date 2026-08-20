import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// 首页进入后展示的学习计划推广弹窗。点击「查看详情」跳转到 /plan 页面。
// 通过 Portal 渲染到 body，避免被祖先的 transform 影响 fixed 定位。
export default function PlanPromoModal({ onClose, onViewDetails }) {
  const closeRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay) return undefined;
    const onOverlayClick = (event) => {
      if (event.target === overlay) onClose();
    };
    overlay.addEventListener("click", onOverlayClick);
    return () => overlay.removeEventListener("click", onOverlayClick);
  }, [onClose]);

  return createPortal(
    <div className="plan-promo-overlay" role="presentation" ref={overlayRef}>
      <div
        className="plan-promo"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-promo-title"
      >
        <button
          type="button"
          className="plan-promo__close"
          aria-label="关闭"
          onClick={onClose}
          ref={closeRef}
        >
          ×
        </button>
        <p className="plan-promo__eyebrow">首期体验 · ¥9.9</p>
        <h2 id="plan-promo-title" className="plan-promo__title">
          别急着报课，先看清孩子卡在哪里
        </h2>
        <p className="plan-promo__desc">
          9.9 元拿到一份孩子专属的英语学习分析报告 + 4 周学习规划 + 老师一对一解读。
        </p>
        <div className="plan-promo__actions">
          <button
            type="button"
            className="plan-promo__btn plan-promo__btn--primary"
            onClick={onViewDetails}
          >
            查看详情
          </button>
          <button
            type="button"
            className="plan-promo__btn plan-promo__btn--ghost"
            onClick={onClose}
          >
            以后再说
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
