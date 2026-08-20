import PhoneticMindMap from "./phoneticMindMap.jsx";
import PhoneticTopBar from "./PhoneticTopBar.jsx";
import ModuleHomeGrid from "../components/shared/ModuleHomeGrid.jsx";
import PageHero from "../components/shared/PageHero.jsx";
import useScrollReveal from "../hooks/useScrollReveal.js";
import "./phonetics.css";

/* ── 语音模块首页统一入口卡 ───────────────────────────── */
const PHONETICS_HOME_ENTRIES = [
  { label: "训练营", page: "phonetics-camp", desc: "7 天语音训练营，从发音意识建立" },
  { label: "音素训练", page: "phonetics-sound", desc: "IPA 音标、元音、辅音与清浊音" },
  { label: "音节与朗读", page: "phonetics-syllable", desc: "音节拆分与单词朗读练习" },
  { label: "句子与语篇", page: "phonetics-sentence", desc: "句子朗读与语篇语音训练" },
];

export default function PhoneticOverviewPage({
  onNavigate,
  onLoginClick,
  onRegisterClick,
  user,
  onAccountClick,
  activePage = "phonetics-overview",
  hideTopBar = false,
}) {
  const pageRef = useScrollReveal();

  return (
    <div className="ph-page" ref={pageRef}>
      {!hideTopBar && (
        <PhoneticTopBar
          onNavigate={onNavigate}
          onLogin={onLoginClick}
          onRegister={onRegisterClick}
          user={user}
          onAccountClick={onAccountClick}
          activePage={activePage}
        />
      )}
      <main className="ph-overview-page">
        <PageHero
          eyebrow="筑巢语音 · 总览"
          title="搭起语音知识框架。"
          description="先看全局结构，再进入音素、音节和句子训练。"
        />
        <ModuleHomeGrid
          module={{ label: "筑巢语音", dot: "#a0307a", border: "rgba(160, 48, 122, 0.22)" }}
          onNavigate={onNavigate}
          title="筑巢语音"
          intro="从训练营、音素、音节到句子与语篇，形成循序渐进的标准发音训练路径。"
          entries={PHONETICS_HOME_ENTRIES}
          primaryEntry="phonetics-camp"
          primaryLabel="进入 7 天语音训练营"
        />
        <PhoneticMindMap onNavigate={onNavigate} />
      </main>
    </div>
  );
}
