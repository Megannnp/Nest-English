import { useEffect, useRef, useState } from "react";

import { usersAPI } from "../api/index.js";
import { PREP_EXAMS, getPrepExam } from "../app/prepExamConfig.js";
import { readSelectedPrepExamId, writeSelectedPrepExamId } from "../app/prepExamSelection.js";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./portal.css";

const CATEGORY_CONTENT = {
  "skill-training": {
    kicker: "Exam Prep",
    title: "备考",
    desc: "先选备考目标，再进入对应模块。模块 UI 保持一致，题型分支和知识库按考试目标变化。",
  },
};

export default function ProductCategoryPage({ onNavigate, user, onUserUpdate, prepExamId = "" }) {
  const pageRef = useScrollReveal({
    targetSelector: ".portal-reveal",
    revealedClass: "portal-revealed",
  });
  const [examId, setExamId] = useState(() => prepExamId || readSelectedPrepExamId(user));
  const [saveError, setSaveError] = useState("");
  const [savingExamId, setSavingExamId] = useState("");
  const savingRef = useRef(false);
  const content = CATEGORY_CONTENT["skill-training"];
  const exam = getPrepExam(examId);

  useEffect(() => {
    setExamId(prepExamId || readSelectedPrepExamId(user));
  }, [prepExamId, user]);

  const selectExam = async (nextExamId) => {
    if (savingRef.current || nextExamId === exam.id) return;
    setSaveError("");
    if (!user?.id) {
      setExamId(writeSelectedPrepExamId(nextExamId));
      return;
    }
    savingRef.current = true;
    setSavingExamId(nextExamId);
    try {
      const updated = await usersAPI.updateProfile({
        preferences: { prepExamId: nextExamId },
      });
      onUserUpdate?.(updated);
      setExamId(writeSelectedPrepExamId(nextExamId));
    } catch (error) {
      setSaveError(error?.message || "备考目标未保存，请稍后在“我的”里重试。");
    } finally {
      savingRef.current = false;
      setSavingExamId("");
    }
  };

  return (
    <div className="portal-page" ref={pageRef}>
      <main className="portal-category">
        <section className="portal-category__intro portal-reveal">
          <p className="portal-category__kicker">{content.kicker}</p>
          <h1>{content.title}</h1>
          <p>{content.desc}</p>
        </section>

        <section className="portal-prep-selector portal-reveal portal-reveal--delay-1" aria-label="选择备考目标">
          <div className="portal-prep-selector__header">
            <h2>选择考试</h2>
            <p>{exam.helper}</p>
          </div>
          <div className="portal-prep-selector__options">
            {PREP_EXAMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={item.id === exam.id ? "is-active" : ""}
                disabled={Boolean(savingExamId)}
                onClick={() => selectExam(item.id)}
              >
                {savingExamId === item.id ? "保存中" : item.label}
              </button>
            ))}
          </div>
          {saveError && <p role="alert" className="portal-prep-selector__error">{saveError}</p>}
        </section>

        <section className="portal-category__grid portal-reveal portal-reveal--delay-1" aria-label={content.title}>
          {exam.modules.map((card) => (
            <article key={card.title} className="portal-category-card">
              <div>
                <h2>{card.title}</h2>
                <div className="portal-category-card__tags" aria-label={`${card.title}题型分支`}>
                  {card.branches.map((branch) => (
                    <span key={branch}>{branch}</span>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => onNavigate?.(card.page)}>
                进入{card.title}
              </button>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
