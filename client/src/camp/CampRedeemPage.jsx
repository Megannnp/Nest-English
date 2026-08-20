import { useState } from "react";

import { shouldShowCampDemoCode } from "./campUtils.js";
import { campAPI } from "../api/index.js";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./camp.css";

export default function CampRedeemPage({ user, onNavigate }) {
  const pageRef = useScrollReveal();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const showDemoCode = shouldShowCampDemoCode();

  async function handleSubmit(event) {
    event.preventDefault();
    if (!user) {
      onNavigate("auth");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      const data = await campAPI.redeem(code);
      setMessage(data.alreadyEnrolled ? "你已开通该课程" : "兑换成功，课程已开通");
      if (data.courseId) {
        setTimeout(() => onNavigate("camp-my-course-detail", { routeOverrides: { selectedCampMyCourseId: data.courseId } }), 500);
      }
    } catch (error) {
      setMessage(error.message || "兑换失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="camp-page" ref={pageRef}>
      <div className="camp-shell">
        <button type="button" className="camp-btn camp-btn--ghost" onClick={() => onNavigate("camp")}>返回学习营地</button>
        <section className="camp-hero studio-reveal">
          <div className="camp-hero__copy">
            <p className="camp-kicker">兑换课程</p>
            <h1>输入兑换码，开通对应课程。</h1>
            <p className="camp-hero__sub">支持活动赠课、线下发卡和合作渠道兑换。兑换成功后课程会出现在“我的课程”。</p>
            <form className="camp-form" onSubmit={handleSubmit}>
              <input
                className="camp-input"
                aria-label="兑换码"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="例如 NESTCAMP2026"
                maxLength={64}
              />
              <button type="submit" className="camp-btn" aria-label={submitting ? "兑换中" : "兑换课程"} disabled={submitting}>{submitting ? "兑换中" : "兑换课程"}</button>
            </form>
            {message && <div className="camp-notice" style={{ marginTop: 16 }}>{message}</div>}
          </div>
          <div className="camp-today">
            <div>
              <div className="camp-today__label">可承载场景</div>
              <div className="camp-today__title">活动赠课 · 线下发卡 · 合作渠道</div>
              <div className="camp-today__meta">兑换成功后自动生成 enrollment 课程权限，并出现在我的课程中。</div>
            </div>
            {showDemoCode && (
              <button type="button" className="camp-btn camp-btn--light" onClick={() => setCode("NESTCAMP2026")}>填入演示码</button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
