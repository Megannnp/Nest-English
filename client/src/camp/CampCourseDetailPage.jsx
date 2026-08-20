/* eslint-disable complexity */
import { useEffect, useState } from "react";

import { canUseCampMockPayment, formatCampDate, getCampCourseActionLabel, getCourseIdFromPath } from "./campUtils.js";
import { campAPI } from "../api/index.js";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./camp.css";

export default function CampCourseDetailPage({ user, onNavigate, courseId: courseIdProp }) {
  const pageRef = useScrollReveal();
  const courseId = courseIdProp || getCourseIdFromPath(/^\/camp\/courses\/([^/]+)$/);
  const [detail, setDetail] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    campAPI.getCourse(courseId)
      .then((data) => { if (active) setDetail(data); })
      .catch((error) => { if (active) setMessage(error.message || "课程加载失败"); });
    return () => { active = false; };
  }, [courseId]);

  async function handleEnroll() {
    if (!user) {
      onNavigate("auth");
      return;
    }
    if (detail?.course?.enrolled) {
      onNavigate("camp-my-course-detail", { routeOverrides: { selectedCampMyCourseId: courseId } });
      return;
    }
    if (!canUseCampMockPayment()) {
      setMessage("当前环境不支持直接报名，请使用兑换码或联系老师开通课程");
      onNavigate("camp-redeem");
      return;
    }
    try {
      await campAPI.mockPay(courseId);
      onNavigate("camp-my-course-detail", { routeOverrides: { selectedCampMyCourseId: courseId } });
    } catch (error) {
      setMessage(error.message || "报名失败");
    }
  }

  const course = detail?.course;
  const actionLabel = getCampCourseActionLabel(course);
  const actionDisabled = course?.status === "coming_soon";

  return (
    <div className="camp-page" ref={pageRef}>
      <div className="camp-shell">
        <button type="button" className="camp-btn camp-btn--ghost" onClick={() => onNavigate("camp")}>返回学习营地</button>
        {message && <div className="camp-notice" style={{ marginTop: 16 }}>{message}</div>}
        {course && (
          <>
            <section className="camp-hero studio-reveal">
              <div className="camp-hero__copy">
                <p className="camp-kicker">课程详情</p>
                <h1>{course.title}</h1>
                <p className="camp-hero__sub">{course.description || course.summary}</p>
                <div className="camp-actions">
                  <button type="button" className="camp-btn" aria-label={actionLabel} onClick={handleEnroll} disabled={actionDisabled}>{actionLabel}</button>
                  <button type="button" className="camp-btn camp-btn--ghost" onClick={() => onNavigate("camp-redeem")}>使用兑换码</button>
                </div>
                {actionDisabled && <div className="camp-disabled-note">课程还未开放报名，可先返回学习营地查看其他课程。</div>}
              </div>
              {course.coverUrl ? (
                <div className="camp-cover-panel">
                  <img src={course.coverUrl} alt={`${course.title} 封面`} onError={(event) => { event.currentTarget.style.display = "none"; }} />
                  <div className="camp-cover-panel__meta">
                    <div className="camp-today__label">开课时间</div>
                    <div className="camp-today__title">{formatCampDate(course.startsAt)}</div>
                    <div className="camp-today__meta">价格：{course.price?.display || "¥0"} · {course.tags?.join(" / ")}</div>
                    <button type="button" className="camp-btn camp-btn--light" aria-label={actionLabel} onClick={handleEnroll} disabled={actionDisabled}>{actionLabel}</button>
                    {actionDisabled && <div className="camp-today__meta">开课后开放报名</div>}
                  </div>
                </div>
              ) : (
                <div className="camp-today">
                  <div>
                    <div className="camp-today__label">开课时间</div>
                    <div className="camp-today__title">{formatCampDate(course.startsAt)}</div>
                    <div className="camp-today__meta">价格：{course.price?.display || "¥0"} · {course.tags?.join(" / ")}</div>
                  </div>
                  <button type="button" className="camp-btn camp-btn--light" aria-label={actionLabel} onClick={handleEnroll} disabled={actionDisabled}>{actionLabel}</button>
                  {actionDisabled && <div className="camp-today__meta">开课后开放报名</div>}
                </div>
              )}
            </section>

            <div className="camp-detail-grid">
              <main className="camp-panel">
                <h3>课程介绍</h3>
                <p>{course.summary}</p>
                <h3>适合对象</h3>
                <ul className="camp-list">
                  {(course.suitableFor || []).map((item) => <li key={item}>{item}</li>)}
                </ul>
                <h3 style={{ marginTop: 18 }}>课程大纲</h3>
                <ul className="camp-list">
                  {(course.outline || []).map((item) => <li key={item}>{item}</li>)}
                </ul>
              </main>
              <aside className="camp-panel">
                <h3>交付内容</h3>
                <p>直播学习、回放、学习资料、今日作业、AI 练习入口和学习进度记录。</p>
                <ul className="camp-list">
                  {(detail.lessons || []).map((lesson) => <li key={lesson.id}>{lesson.title} · {formatCampDate(lesson.startsAt)}</li>)}
                </ul>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
