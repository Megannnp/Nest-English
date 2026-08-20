import LearningStatusPanel from "../components/shared/LearningStatusPanel.jsx";

const STATUS_META = {
  "phonetics-sound": {
    tasks: ["练 1 组元音", "对比 1 组清浊辅音", "听 6 个例词"],
    records: ["元音训练", "辅音对比", "例词跟听"],
  },
  "phonetics-syllable": {
    tasks: ["看 1 遍音节总览", "辨认开/闭音节", "区分主重读与次重读"],
    records: ["音节总览", "音节分类", "重读音节"],
  },
  "phonetics-sentence": {
    tasks: ["学习 1 个韵律点", "学习 1 个语流现象", "整理 1 条句子朗读规则"],
    records: ["句子韵律", "语流现象", "朗读规则"],
  },
  "phonetics-discourse": {
    tasks: ["阅读语篇框架", "标记 1 处信息焦点", "整理 1 条段落节奏规则"],
    records: ["语篇框架", "信息焦点", "段落节奏"],
  },
};

export default function PhoneticStatusPanel({ activePage, onNavigate: _onNavigate }) {
  const meta = STATUS_META[activePage] || STATUS_META["phonetics-sound"];
  return (
    <LearningStatusPanel
      className="ph-status-panel"
      tasks={meta.tasks}
      abilities={[]}
      records={[]}
    />
  );
}
