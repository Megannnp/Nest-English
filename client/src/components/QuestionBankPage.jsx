import { Suspense, lazy } from "react";

const QuestionSourceBrowser = lazy(() => import("./questions/QuestionSourceBrowser.jsx"));

export default function QuestionBankPage({ questions = [], isMobile = false }) {
  return (
    <Suspense fallback={<div style={{ minHeight: 240, borderRadius: 20, background: "linear-gradient(180deg, #fffdfa 0%, #fff 100%)", border: "1px solid #ece6de" }} />}>
      <QuestionSourceBrowser
        questions={questions}
        title="题目来源预览"
        subtitle="这是保留给旧代码路径的轻量包装壳。正式选题入口已经迁回写作页和教师工作台。"
        emptyText="当前没有可用题目，先在写作流或工作台中沉淀题目内容。"
        isMobile={isMobile}
      />
    </Suspense>
  );
}
