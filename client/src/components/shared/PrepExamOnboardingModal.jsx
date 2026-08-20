import { useEffect, useRef, useState } from "react";

import { usersAPI } from "../../api/index.js";
import { PREP_EXAMS } from "../../app/prepExamConfig.js";
import { writeSelectedPrepExamId } from "../../app/prepExamSelection.js";
import "./PrepExamOnboardingModal.css";

// 仅在注册/登录后从未选过备考考试、也从未关闭过引导时，展示一次。
const DISMISSED_KEY = "nest_prep_exam_onboarding_dismissed";

function readDismissed() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed() {
  try {
    window.localStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // ignore storage failures
  }
}

// 只认「显式选择」：user.preferences.prepExamId 非空才算选过。
// 不能用 readSelectedPrepExamId —— 它对未选择用户返回默认考试（gaokao），
// 会导致引导弹窗永不出现。
function hasUserSelectedExam(user) {
  return Boolean(user?.preferences?.prepExamId);
}

export default function PrepExamOnboardingModal({ user, onUserUpdate }) {
  const [open, setOpen] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const savingRef = useRef(false);

  const isStudent = user?.role === "student" && user?.is_admin !== 1;

  useEffect(() => {
    if (
      !user?.id ||
      !isStudent ||
      hasUserSelectedExam(user) ||
      readDismissed()
    ) {
      setOpen(false);
      return;
    }
    // 仅在学生进入主应用（非 auth / 非 profile onboarding）时弹出。
    // 避免每次路由都打断；用会话内 ref 避免重复弹。
    setOpen(true);
  }, [isStudent, user]);

  if (!open) return null;

  // 初次未选择时不会丢失；用户选择考试后持久化并关闭。
  async function selectExam(examId) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSavingId(examId);
    setError("");
    try {
      let updatedUser = user;
      if (user?.id) {
        updatedUser = await usersAPI.updateProfile({
          preferences: { prepExamId: examId },
        });
      }
      const nextExamId = writeSelectedPrepExamId(examId);
      writeDismissed();
      if (updatedUser) {
        onUserUpdate?.(updatedUser);
      }
      setOpen(false);
      // 选择考试只更新时间与题库内容，不强行跳转，
      // 避免打断用户原本所在页面（例如从写作/阅读页登录后弹窗选考试）。
      window.dispatchEvent(new CustomEvent("nest:prep-exam-change", { detail: { examId: nextExamId } }));
    } catch (err) {
      setError(err?.message || "保存失败，请重试。");
    } finally {
      savingRef.current = false;
      setSavingId("");
    }
  }

  function dismiss() {
    // 用户明确关闭：标记已读，本次登录不再弹出（可在「备考」页随时更换）。
    writeDismissed();
    setOpen(false);
  }

  return (
    <div className="pxo-backdrop" role="presentation">
      <div className="pxo-modal" role="dialog" aria-modal="true" aria-label="选择备考考试">
        <div className="pxo-modal__head">
          <span className="pxo-modal__kicker">Select Your Exam</span>
          <h2>选择备考考试</h2>
          <p>选择一个目标，后续的词汇、语法、阅读、听力和写作内容会按该考试题型与范围组织。</p>
        </div>

        <div className="pxo-grid">
          {PREP_EXAMS.map((exam) => (
            <button
              key={exam.id}
              type="button"
              className="pxo-card"
              onClick={() => selectExam(exam.id)}
              disabled={Boolean(savingId)}
            >
              <strong>{exam.label}</strong>
              <span>{exam.helper}</span>
              {savingId === exam.id ? <em>保存中…</em> : <em>选择</em>}
            </button>
          ))}
        </div>

        {error ? <p className="pxo-error" role="alert">{error}</p> : null}

        <div className="pxo-modal__foot">
          <button type="button" className="pxo-skip" onClick={dismiss}>先跳过</button>
        </div>
      </div>
    </div>
  );
}