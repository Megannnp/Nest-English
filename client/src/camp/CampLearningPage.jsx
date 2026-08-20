import { useEffect, useState } from "react";

import { formatCampDate, getCourseIdFromPath, openExternalLive } from "./campUtils.js";
import { campAPI } from "../api/index.js";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./camp.css";

function LearningHero({ course, data, progress, liveUrl, onRecordAction }) {
  const todayLive = data.todayLive;
  const hasLive = Boolean(liveUrl);
  return (
    <section className="camp-hero camp-hero--compact">
      <div className="camp-hero__copy">
        <p className="camp-kicker">学习中心</p>
        <h1>{course.title}</h1>
        <p className="camp-hero__sub">先完成今天任务，再看目录和资料。</p>
        <div className="camp-progress"><span style={{ width: `${progress}%` }} /></div>
        <p className="camp-section__hint">学习进度：{progress}% · {data.progress.lastRecord}</p>
      </div>
      <div className="camp-today">
        <div>
          <div className="camp-today__label">今日直播</div>
          <div className="camp-today__title">{todayLive.title}</div>
          <div className="camp-today__meta">{todayLive.meta}</div>
        </div>
        <button type="button" className="camp-btn camp-btn--light" onClick={() => { openExternalLive(liveUrl); onRecordAction("live", todayLive?.id); }} disabled={!hasLive}>进入直播</button>
        {!hasLive && <div className="camp-today__meta">今天没有直播，先完成下方任务或查看回放。</div>}
      </div>
    </section>
  );
}

function LearningBody({ data, onNavigate, liveUrl, onRecordAction }) {
  const hasLive = Boolean(liveUrl);
  const hasHomework = data.homework.status === "ready";
  const hasAiPractice = data.aiPractice.status === "ready" && Boolean(data.aiPractice.targetPage);
  return (
    <>
      <section className="camp-task-panel">
        <div>
          <p className="camp-kicker">今天任务</p>
          <h2>{data.todayLive.title}</h2>
          <p>{data.todayLive.meta}</p>
        </div>
        <div className="camp-task-list">
          <div className={!hasHomework ? "is-empty" : ""}><strong>{hasHomework ? "作业" : "作业待发布"}</strong><span>{data.homework.description}</span></div>
          <div className={!hasAiPractice ? "is-empty" : ""}><strong>{hasAiPractice ? "AI 练习" : "AI 练习待配置"}</strong><span>{data.aiPractice.description}</span></div>
        </div>
        <div className="camp-actions">
          <button type="button" className="camp-btn" onClick={() => { onRecordAction("ai_practice"); onNavigate(data.aiPractice.targetPage); }} disabled={!hasAiPractice}>开始 AI 练习</button>
          <button type="button" className="camp-btn camp-btn--ghost" onClick={() => { openExternalLive(liveUrl); onRecordAction("live", data.todayLive?.id); }} disabled={!hasLive}>进入直播</button>
        </div>
        {(!hasAiPractice || !hasLive) && <div className="camp-disabled-note">不可用的按钮会在老师发布任务或直播开始后开放。</div>}
      </section>

      <div className="camp-learn-grid">
        <main className="camp-panel">
          <h3>课程目录</h3>
          <ul className="camp-list">
            {data.lessons.map((lesson) => (
              <li key={lesson.id}>
                <strong>{lesson.title}</strong>
                <div>{formatCampDate(lesson.startsAt)}</div>
              </li>
            ))}
          </ul>
          <h3 style={{ marginTop: 18 }}>回放</h3>
          <ul className="camp-list">
            {data.lessons.map((lesson) => (
              <li key={`${lesson.id}-replay`}>
                {lesson.replayUrl ? (
                  <button type="button" className="camp-link-btn" onClick={() => { openExternalLive(lesson.replayUrl); onRecordAction("replay", lesson.id); }}>{lesson.replayLabel} · {lesson.title}</button>
                ) : `${lesson.replayLabel} · ${lesson.title}`}
              </li>
            ))}
          </ul>
        </main>
        <aside className="camp-panel">
          <h3>学习资料</h3>
          <ul className="camp-list">
            {data.materials.map((item) => (
              <li key={item.id}>
                {item.url ? (
                  <button type="button" className="camp-link-btn" onClick={() => { openExternalLive(item.url); onRecordAction("material", item.lessonId); }}>{item.title} · {item.type}</button>
                ) : `${item.title} · ${item.type}`}
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}

function normalizeLearningData(data) {
  const todayLive = data.todayLive
    ? {
        ...data.todayLive,
        title: data.todayLive.title,
        meta: formatCampDate(data.todayLive.startsAt),
      }
    : { title: "暂无直播", meta: "可先查看回放和学习资料" };
  return {
    ...data,
    todayLive,
    progress: {
      progressPercent: data.progress?.progressPercent || 0,
      lastRecord: data.progress?.lastRecord || "准备开始学习",
    },
    lessons: (data.lessons || []).map((lesson) => ({
      ...lesson,
      replayLabel: lesson.replayUrl ? "查看回放" : "回放待上传",
    })),
    materials: data.materials || [],
    homework: data.homework
      ? { status: data.homework.status || "placeholder", description: data.homework.description || "今日作业待发布" }
      : { status: "placeholder", description: "今日作业待发布" },
    aiPractice: data.aiPractice
      ? { status: data.aiPractice.status || "placeholder", description: data.aiPractice.description || "AI 练习入口待配置", targetPage: data.aiPractice.targetPage || "" }
      : { status: "placeholder", description: "AI 练习入口待配置", targetPage: "" },
  };
}

export default function CampLearningPage({ onNavigate, courseId: courseIdProp }) {
  const pageRef = useScrollReveal();
  const courseId = courseIdProp || getCourseIdFromPath(/^\/camp\/my-courses\/([^/]+)$/);
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    campAPI.getMyCourse(courseId)
      .then((result) => { if (active) setData(result); })
      .catch((error) => { if (active) setMessage(error.message || "课程加载失败"); });
    return () => { active = false; };
  }, [courseId]);

  const viewData = data ? normalizeLearningData(data) : null;
  const course = viewData?.course;
  const liveUrl = viewData?.todayLive?.liveUrl || "";
  const progress = viewData?.progress.progressPercent || 0;
  const recordLearningAction = (action, lessonId = null) => {
    if (!courseId) return;
    campAPI.recordProgress(courseId, {
      action,
      lessonId,
    })
      .then((nextProgress) => {
        setData((current) => current ? { ...current, progress: nextProgress } : current);
      })
      .catch(() => {});
  };

  return (
    <div className="camp-page" ref={pageRef}>
      <div className="camp-shell">
        <button type="button" className="camp-btn camp-btn--ghost" onClick={() => onNavigate("camp")}>返回学习营地</button>
        {message && <div className="camp-notice" style={{ marginTop: 16 }}>{message}</div>}
        {message && !course && (
          <div className="camp-empty-state">
            <h2>还不能进入学习中心</h2>
            <p>你可能还没有报名这门课，先返回学习营地查看课程或使用兑换码开通。</p>
            <div className="camp-actions">
              <button type="button" className="camp-btn" onClick={() => onNavigate("camp")}>查看课程</button>
              <button type="button" className="camp-btn camp-btn--ghost" onClick={() => onNavigate("camp-redeem")}>兑换课程</button>
            </div>
          </div>
        )}
        {course && viewData && (
          <>
            <LearningHero course={course} data={viewData} progress={progress} liveUrl={liveUrl} onRecordAction={recordLearningAction} />
            <LearningBody data={viewData} onNavigate={onNavigate} liveUrl={liveUrl} onRecordAction={recordLearningAction} />
          </>
        )}
      </div>
    </div>
  );
}
