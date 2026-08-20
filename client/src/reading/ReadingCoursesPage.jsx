import { useState, useMemo, useEffect } from "react";

import { READING_COURSE_TREE } from "./readingCourseContent.js";
import { TreeNode, countLeafs, findAncestors } from "./ReadingCourseTree.jsx";
import ReadingTopBar from "./ReadingTopBar.jsx";
import { moduleAssignmentsAPI, readingAPI } from "../api/index.js";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import { clearModuleTaskContext, readModuleTaskContext } from "../utils/moduleTaskContext.js";
import "./reading.css";

function readReadingCourseTask() {
  return readModuleTaskContext("reading-courses");
}

/* ── Main page ───────────────────────────────────────────── */
export default function ReadingCoursesPage({
  onNavigate, user, onLoginClick, onRegisterClick,
  activePage = "reading-courses", onAccountClick,
  hideTopBar = false}) {
  const pageRef = useScrollReveal();
  const [activeId, setActiveId] = useState(null);
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [completedIds, setCompletedIds] = useState(new Set());
  const [moduleTask, setModuleTask] = useState(readReadingCourseTask);
  const [taskSubmitError, setTaskSubmitError] = useState("");

  const totalLeafs = useMemo(() => countLeafs(READING_COURSE_TREE), []);
  const completedCount = completedIds.size;
  const progressPct = totalLeafs > 0 ? Math.round((completedCount / totalLeafs) * 100) : 0;

  // Support deep-link from analyzer (reading passage type → specific course node)
  useEffect(() => {
    try {
      const seed = JSON.parse(sessionStorage.getItem("nestReadingCoursesSeed") || "{}");
      if (seed.nodeId) {
        sessionStorage.removeItem("nestReadingCoursesSeed");
        const ancestors = findAncestors(READING_COURSE_TREE, seed.nodeId) || [seed.nodeId];
        setExpandedIds(new Set(ancestors));
        setActiveId(seed.nodeId);
        setTimeout(() => {
          document.getElementById(`rdc-node-${seed.nodeId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setCompletedIds(new Set());
      return () => { cancelled = true; };
    }
    readingAPI.courseProgress()
      .then((data) => {
        if (cancelled) return;
        const completed = (data?.nodes || []).filter((node) => node.status === "completed").map((node) => node.nodeId);
        setCompletedIds(new Set(completed));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user?.id]);

  function handleComplete(id, quizStats = {}) {
    const shouldSubmitTask = Number(quizStats.quizTotal || 0) > 0;
    setCompletedIds(prev => prev.has(id) ? prev : new Set([...prev, id]));
    if (user?.id) {
      setTaskSubmitError("");
      readingAPI.saveCourseProgress({
        nodeId: id,
        status: "completed",
        quizCorrect: quizStats.quizCorrect ?? 0,
        quizTotal: quizStats.quizTotal ?? 0,
      }).then(() => {
        if (!moduleTask?.id || !shouldSubmitTask) return null;
        return moduleAssignmentsAPI.submit(moduleTask.id).then(() => {
          clearModuleTaskContext();
          setModuleTask(null);
        });
      }).catch((error) => {
        setTaskSubmitError(error?.message || "课程进度保存失败，请稍后重试。");
      });
    }
  }

  return (
    <div className="rd-page" ref={pageRef}>
      {!hideTopBar && (

        <ReadingTopBar
        onLogin={onLoginClick || (() => onNavigate?.("auth"))}
        onRegister={onRegisterClick || (() => onNavigate?.("auth"))}
        user={user}
        onNavigate={onNavigate}
        activePage={activePage}
        onAccountClick={onAccountClick}
      />

      )}

      <main className="rdc-page">
        <PageHero
          eyebrow="筑巢阅读 · 精讲"
          title="读懂题型，读透文章。"
          description="从题型策略到文体解析，系统提升英语阅读能力。"
        />

        {completedCount > 0 && (
          <div className="rdc-progress-wrap studio-reveal">
            <div className="rdc-progress-bar">
              <div className="rdc-progress-bar__fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="rdc-progress-bar__label">{completedCount} / {totalLeafs} · {progressPct}%</span>
          </div>
        )}
        {taskSubmitError && (
          <div style={{ margin: "12px 0", color: "#8a2a1a", fontSize: 13, fontWeight: 700 }}>
            {taskSubmitError}
          </div>
        )}

        <section className="rdc-tree studio-reveal">
          {READING_COURSE_TREE.map(node => (
            <TreeNode
              key={node.id}
              node={node}
              depth={0}
              activeId={activeId}
              expandedIds={expandedIds}
              completedIds={completedIds}
              onComplete={handleComplete}
            />
          ))}
        </section>
      </main>
    </div>
  );
}
