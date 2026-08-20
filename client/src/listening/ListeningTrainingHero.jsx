import PageHero from "../components/shared/PageHero.jsx";

const LISTENING_PAGE_META = {
  "listening-basics": {
    kicker: "筑巢听读 · 基础",
    title: "先听准，再写对。",
    desc: "用辨音、词汇听写和句子听写建立听力底盘。",
  },
  "listening-advanced": {
    kicker: "筑巢听读 · 精听",
    title: "逐句精听，听出原文。",
    desc: "先听全文，再逐句拆解，用听写把理解落到文字上。",
  },
  "listening-practice": {
    kicker: "筑巢听读 · 模拟",
    title: "做题检验，听力模拟。",
    desc: "按学段生成听力材料，完成选择题和关键句听写。",
  },
};

export default function ListeningTrainingHero({ activePage }) {
  const meta = LISTENING_PAGE_META[activePage] || LISTENING_PAGE_META["listening-basics"];
  return <PageHero eyebrow={meta.kicker} title={meta.title} description={meta.desc} />;
}
