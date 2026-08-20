import { useEffect, useMemo, useState } from "react";

import { canUseCampMockPayment, formatCampDate, getCampCourseActionLabel, openExternalLive } from "./campUtils.js";
import { campAPI } from "../api/index.js";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./camp.css";

function CourseCard({ course, onNavigate, onEnroll }) {
  const isComingSoon = course.status === "coming_soon";
  const mockPaymentEnabled = canUseCampMockPayment();
  return (
    <article className="camp-card">
      <div className="camp-card__cover">
        {course.coverUrl && <img src={course.coverUrl} alt="" className="camp-card__image" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
        <div className="camp-tags">
          {(course.tags || []).map((tag) => <span key={tag} className="camp-tag">{tag}</span>)}
        </div>
      </div>
      <div className="camp-card__body">
        <h3>{course.title}</h3>
        <p>{course.summary}</p>
        <div className="camp-section__head" style={{ marginBottom: 0 }}>
          <span className="camp-price">{course.price?.display || "¥0"}</span>
          <div className="camp-actions" style={{ marginTop: 0 }}>
            <button type="button" className="camp-btn camp-btn--ghost" onClick={() => onNavigate("camp-course-detail", { routeOverrides: { selectedCampCourseId: course.id } })}>查看详情</button>
            <button type="button" className="camp-btn" onClick={() => onEnroll(course)} disabled={isComingSoon}>
              {getCampCourseActionLabel(course, mockPaymentEnabled)}
            </button>
          </div>
        </div>
        {isComingSoon && <div className="camp-disabled-note">开课后开放报名</div>}
      </div>
    </article>
  );
}

function MyCourseCard({ item, onNavigate }) {
  const course = item.course;
  const progress = item.progress?.progressPercent || 0;
  const liveUrl = item.todayLive?.liveUrl || "";
  return (
    <article className="camp-panel">
      <h3>{course.title}</h3>
      <div className="camp-progress" aria-label={`学习进度 ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
      <p>当前学习进度：{progress}%</p>
      <p>今日直播：{item.todayLive ? `${item.todayLive.title} · ${formatCampDate(item.todayLive.startsAt)}` : "今天暂无直播安排"}</p>
      <p>最近学习记录：{item.recentRecord || "准备开始学习"}</p>
      {!liveUrl && <div className="camp-disabled-note">今天没有直播，先看回放或学习资料。</div>}
      <div className="camp-actions">
        <button type="button" className="camp-btn" onClick={() => onNavigate("camp-my-course-detail", { routeOverrides: { selectedCampMyCourseId: course.id } })}>继续学习</button>
        <button type="button" className="camp-btn camp-btn--ghost" onClick={() => openExternalLive(liveUrl)} disabled={!liveUrl}>进入直播</button>
        <button type="button" className="camp-btn camp-btn--muted" onClick={() => onNavigate("camp-my-course-detail", { routeOverrides: { selectedCampMyCourseId: course.id } })}>查看回放</button>
      </div>
    </article>
  );
}

export default function CampHomePage({ user, onNavigate }) {
  const pageRef = useScrollReveal();
  const [courses, setCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [me, setMe] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    campAPI.listCourses()
      .then((data) => { if (active) setCourses(data || []); })
      .catch((error) => { if (active) setMessage(error.message || "课程加载失败"); });

    if (!user) {
      setMyCourses([]);
      setMe(null);
    } else {
      Promise.all([campAPI.listMyCourses(), campAPI.me()])
        .then(([mine, meData]) => {
          if (!active) return;
          setMyCourses(mine || []);
          setMe(meData || null);
        })
        .catch(() => {});
    }
    return () => { active = false; };
  }, [user]);

  const todayPlan = useMemo(() => {
    const liveCourse = myCourses.find((item) => item.todayLive);
    if (liveCourse) return {
      title: liveCourse.course.title,
      meta: `${liveCourse.todayLive.title} · ${formatCampDate(liveCourse.todayLive.startsAt)}`,
      action: () => onNavigate("camp-my-course-detail", { routeOverrides: { selectedCampMyCourseId: liveCourse.course.id } }),
    };
    const first = myCourses[0];
    if (first) return {
      title: first.course.title,
      meta: first.recentRecord || "继续完成下一节课程内容",
      action: () => onNavigate("camp-my-course-detail", { routeOverrides: { selectedCampMyCourseId: first.course.id } }),
    };
    return {
      title: "从一门学习营开始",
      meta: "先选择适合你的课程，开通后这里会显示今天学什么。",
      action: () => document.getElementById("camp-recommended")?.scrollIntoView({ behavior: "smooth" }),
    };
  }, [myCourses, onNavigate]);

  async function handleEnroll(course) {
    if (!user) {
      onNavigate("auth");
      return;
    }
    if (course.enrolled) {
      onNavigate("camp-my-course-detail", { routeOverrides: { selectedCampMyCourseId: course.id } });
      return;
    }
    if (!canUseCampMockPayment()) {
      setMessage("当前环境不支持直接报名，请使用兑换码或联系老师开通课程");
      onNavigate("camp-redeem");
      return;
    }
    try {
      await campAPI.mockPay(course.id);
      setMessage("mock 支付成功，课程已开通");
      const [nextCourses, nextMine, nextMe] = await Promise.all([campAPI.listCourses(), campAPI.listMyCourses(), campAPI.me()]);
      setCourses(nextCourses || []);
      setMyCourses(nextMine || []);
      setMe(nextMe || null);
    } catch (error) {
      setMessage(error.message || "报名失败");
    }
  }

  return (
    <div className="camp-page" ref={pageRef}>
      <div className="camp-shell">
        <section className="camp-hero studio-reveal">
          <div className="camp-hero__copy">
            <p className="camp-kicker">Nest Camp · 学习营地</p>
            <h1>今天学什么。</h1>
            <p className="camp-hero__sub">选课、直播、回放和作业放在一个入口里，打开就继续。</p>
            <div className="camp-actions">
              <button type="button" className="camp-btn" onClick={() => todayPlan.action()}>继续学习</button>
              <button type="button" className="camp-btn camp-btn--ghost" onClick={() => onNavigate("camp-redeem")}>兑换课程</button>
            </div>
          </div>
          <div className="camp-today">
            <div>
              <div className="camp-today__label">今天学什么</div>
              <div className="camp-today__title">{todayPlan.title}</div>
              <div className="camp-today__meta">{todayPlan.meta}</div>
            </div>
            <button type="button" className="camp-btn camp-btn--light" onClick={() => todayPlan.action()}>打开学习中心</button>
          </div>
        </section>

        {message && <div className="camp-notice">{message}</div>}

        <section className="camp-section studio-reveal studio-reveal--delay-1" id="camp-recommended">
          <div className="camp-section__head">
            <div>
              <h2>推荐课程 · 最新上线</h2>
              <p className="camp-section__hint">先选一门适合今天开始的课。</p>
            </div>
          </div>
          {courses.length ? (
            <div className="camp-course-grid">
              {courses.map((course) => <CourseCard key={course.id} course={course} onNavigate={onNavigate} onEnroll={handleEnroll} />)}
            </div>
          ) : (
            <div className="camp-empty-state">
              <h2>课程正在准备中</h2>
              <p>暂时没有可展示的学习营课程，可以稍后再来或使用已有兑换码。</p>
              <div className="camp-actions">
                <button type="button" className="camp-btn camp-btn--ghost" onClick={() => onNavigate("camp-redeem")}>兑换课程</button>
              </div>
            </div>
          )}
        </section>

        <section className="camp-section">
          <div className="camp-section__head">
            <div>
              <h2>我的课程</h2>
              <p className="camp-section__hint">已购买或已开通课程会显示进度、直播和最近记录。</p>
            </div>
          </div>
          {user && myCourses.length ? (
            <div className="camp-my-grid">
              {myCourses.map((item) => <MyCourseCard key={item.course.id} item={item} onNavigate={onNavigate} />)}
            </div>
          ) : user ? (
            <div className="camp-empty-state">
              <h2>还没有开通课程</h2>
              <p>先从推荐课程报名，或使用老师发放的兑换码开通课程。</p>
              <div className="camp-actions">
                <button type="button" className="camp-btn" onClick={() => document.getElementById("camp-recommended")?.scrollIntoView({ behavior: "smooth" })}>查看课程</button>
                <button type="button" className="camp-btn camp-btn--ghost" onClick={() => onNavigate("camp-redeem")}>兑换课程</button>
              </div>
            </div>
          ) : (
            <div className="camp-empty-state">
              <h2>登录后继续学习</h2>
              <p>登录后可以看到已购买课程、学习进度、直播和回放入口。</p>
              <div className="camp-actions">
                <button type="button" className="camp-btn" onClick={() => onNavigate("auth")}>去登录</button>
                <button type="button" className="camp-btn camp-btn--ghost" onClick={() => document.getElementById("camp-recommended")?.scrollIntoView({ behavior: "smooth" })}>先看课程</button>
              </div>
            </div>
          )}
        </section>

        <section className="camp-section camp-section--quiet">
          <div className="camp-section__head">
            <div>
              <h2>我的</h2>
              <p className="camp-section__hint">课程账户、兑换和记录入口。</p>
            </div>
          </div>
          <div className="camp-mine-grid">
            <button type="button" className="camp-mine-item" onClick={() => onNavigate("camp")}><strong>已购买课程</strong><span>{me?.purchasedCourses ?? myCourses.length} 门</span></button>
            <button type="button" className="camp-mine-item" onClick={() => onNavigate("camp-redeem")}><strong>兑换课程</strong><span>活动赠课 / 线下发卡</span></button>
            <button type="button" className="camp-mine-item" onClick={() => onNavigate("camp")}><strong>学习记录</strong><span>{me?.learningRecords?.length || 0} 条</span></button>
            <button type="button" className="camp-mine-item" disabled><strong>学习证书</strong><span>完成课程后开放</span></button>
            <button type="button" className="camp-mine-item" disabled><strong>联系客服</strong><span>客服入口暂未开放</span></button>
          </div>
        </section>
      </div>
    </div>
  );
}
