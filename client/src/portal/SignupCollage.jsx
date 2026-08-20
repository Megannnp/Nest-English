import "./portal.css";

function WritingFeedbackCard({ size = "md" }) {
  return (
    <div className={`portal-mock-card portal-mock-card--writing portal-mock-card--${size}`}>
      <div className="pmw-header">
        <div className="pmw-title-row">
          <div className="pmw-dot pmw-dot--red" />
          <div className="pmw-dot pmw-dot--yellow" />
          <div className="pmw-dot pmw-dot--green" />
          <span className="pmw-label">AI 写作批改</span>
        </div>
      </div>
      <div className="pmw-body">
        <div className="pmw-score-row">
          <div className="pmw-score">
            <div className="pmw-score-num">14.5</div>
            <div className="pmw-score-sub">/ 20 分</div>
          </div>
          <div className="pmw-score-bars">
            <div className="pmw-bar-row"><span>内容</span><div className="pmw-bar"><div className="pmw-bar-fill" style={{ width: "78%", background: "rgba(45,32,22,0.65)" }} /></div></div>
            <div className="pmw-bar-row"><span>语言</span><div className="pmw-bar"><div className="pmw-bar-fill" style={{ width: "65%", background: "rgba(45,32,22,0.45)" }} /></div></div>
            <div className="pmw-bar-row"><span>结构</span><div className="pmw-bar"><div className="pmw-bar-fill" style={{ width: "82%", background: "rgba(45,32,22,0.65)" }} /></div></div>
          </div>
        </div>
        <div className="pmw-text-block">
          <div className="pmw-text-line pmw-text-line--full" />
          <div className="pmw-text-line pmw-text-line--full" />
          <div className="pmw-text-line pmw-text-line--partial" style={{ width: "70%" }} />
          <div className="pmw-inline-comment">
            <div className="pmw-comment-tag">语言</div>
            <div className="pmw-comment-text">建议使用更高级的词汇替换 "good"</div>
          </div>
          <div className="pmw-text-line pmw-text-line--full" />
          <div className="pmw-text-line pmw-text-line--partial" style={{ width: "55%" }} />
        </div>
      </div>
    </div>
  );
}

function GrammarAnalyzerCard({ size = "md" }) {
  return (
    <div className={`portal-mock-card portal-mock-card--grammar portal-mock-card--${size}`}>
      <div className="pmg-header">
        <span className="pmg-label">长难句分析</span>
        <div className="pmg-badge">AI</div>
      </div>
      <div className="pmg-sentence">
        <span className="pmg-word pmg-word--subject">The scientists</span>
        <span className="pmg-word"> </span>
        <span className="pmg-word pmg-word--verb">who discovered</span>
        <span className="pmg-word"> </span>
        <span className="pmg-word pmg-word--object">the new element</span>
        <span className="pmg-word"> </span>
        <span className="pmg-word pmg-word--verb2">were awarded</span>
        <span className="pmg-word"> </span>
        <span className="pmg-word pmg-word--complement">the Nobel Prize</span>
        <span className="pmg-word">.</span>
      </div>
      <div className="pmg-tree">
        <div className="pmg-tree-node pmg-tree-node--root">句子</div>
        <div className="pmg-tree-row">
          <div className="pmg-tree-branch">
            <div className="pmg-tree-node pmg-tree-node--sub">主语</div>
            <div className="pmg-tree-node pmg-tree-node--leaf">The scientists</div>
          </div>
          <div className="pmg-tree-branch">
            <div className="pmg-tree-node pmg-tree-node--sub">谓语</div>
            <div className="pmg-tree-node pmg-tree-node--leaf">were awarded</div>
          </div>
          <div className="pmg-tree-branch">
            <div className="pmg-tree-node pmg-tree-node--sub">宾语</div>
            <div className="pmg-tree-node pmg-tree-node--leaf">the Nobel Prize</div>
          </div>
        </div>
      </div>
      <div className="pmg-tags">
        <span className="pmg-tag">定语从句</span>
        <span className="pmg-tag">被动语态</span>
        <span className="pmg-tag">复合句</span>
      </div>
    </div>
  );
}

function GrammarCourseCard({ size = "md" }) {
  return (
    <div className={`portal-mock-card portal-mock-card--course portal-mock-card--${size}`}>
      <div className="pmc-thumb">
        <div className="pmc-play-btn">▶</div>
        <div className="pmc-duration">12:34</div>
      </div>
      <div className="pmc-body">
        <div className="pmc-chapter">Chapter 3 · 非谓语动词</div>
        <div className="pmc-title">不定式的五大用法精讲</div>
        <div className="pmc-progress-row">
          <div className="pmc-progress-bar"><div className="pmc-progress-fill" style={{ width: "40%" }} /></div>
          <span className="pmc-progress-label">40%</span>
        </div>
      </div>
    </div>
  );
}

function WritingScoreCard({ size = "sm" }) {
  return (
    <div className={`portal-mock-card portal-mock-card--score portal-mock-card--${size}`}>
      <div className="pms-label">本周进步</div>
      <div className="pms-num">+2.5<span className="pms-unit">分</span></div>
      <div className="pms-sub">相比上周写作均分</div>
      <div className="pms-sparkline">
        {[40, 55, 48, 62, 58, 72, 78].map((h, i) => (
          <div key={i} className="pms-bar" style={{ height: `${h}%` }} />
        ))}
      </div>
    </div>
  );
}

export default function SignupCollage({ tagline = "英语进步，从这里开始看见", style }) {
  return (
    <div className="portal-signup-collage" style={{ height: "100%", ...style }}>
      <div className="portal-signup-collage__grid">
        <WritingFeedbackCard size="md" />
        <GrammarAnalyzerCard size="md" />
        <GrammarCourseCard size="md" />
        <WritingScoreCard size="md" />
      </div>
      <div className="portal-signup-collage__overlay">
        <p className="portal-signup-collage__text">{tagline}</p>
      </div>
    </div>
  );
}
