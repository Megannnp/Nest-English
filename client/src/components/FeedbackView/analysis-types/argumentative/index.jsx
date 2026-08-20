import VocabularyList from '../../shared/VocabularyList';
import {
  AnalysisPage,
  AnalysisSection as Section,
  AnalysisCard,
  AnalysisMetric as ScoreMetric,
  AnalysisResourceGrid,
  ANALYSIS_THEME,
} from '../shared-ui.jsx';

function BulletList({ items, emptyText }) {
  const safeItems = Array.isArray(items) ? items : [];
  if (!safeItems.length) {
    return <div style={{ fontSize: 13, color: ANALYSIS_THEME.subtext }}>{emptyText}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {safeItems.map((item, idx) => (
        <AnalysisCard key={idx} compact>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: ANALYSIS_THEME.text }}>{item}</div>
        </AnalysisCard>
      ))}
    </div>
  );
}

export default function ArgumentativeAnalysis({ feedback }) {
  const thesis = feedback?.thesisAnalysis || { position: '未识别论点', clarity: 0, suggestions: [] };
  const evidence = feedback?.evidenceEvaluation || { sufficiency: 0, relevance: 0, missingEvidence: [] };
  const logic = feedback?.logicStructure || { coherence: 0, transitionQuality: 0, flowIssues: [] };
  const vocabData = Array.isArray(feedback?.vocabulary) ? feedback.vocabulary : [];

  return (
    <AnalysisPage>
      <Section title="论点明确性分析" subtitle="先看中心论点是否清楚，再决定整篇议论文有没有立得住。">
        <AnalysisCard>
          <div style={{ fontSize: 12, fontWeight: 700, color: ANALYSIS_THEME.subtext, marginBottom: 8 }}>识别论点</div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: ANALYSIS_THEME.text, fontWeight: 700 }}>{thesis.position}</div>
        </AnalysisCard>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginTop: 12 }}>
          <ScoreMetric label="论点清晰度" value={thesis.clarity} description="判断观点是否集中、明确、没有歧义。" />
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: ANALYSIS_THEME.accent, marginBottom: 6 }}>修改建议</div>
          <BulletList items={thesis.suggestions} emptyText="当前没有额外的论点修改建议。" />
        </div>
      </Section>

      <Section title="论据充分性评估" subtitle="检查论据数量、相关性和支撑力度，避免出现观点有了但撑不起来。">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
          <ScoreMetric label="论据充分性" value={evidence.sufficiency} description="论据是否够用，能否支撑主要观点。" />
          <ScoreMetric label="论据相关性" value={evidence.relevance} description="论据和论点之间是否贴合、有效。" />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: ANALYSIS_THEME.accent, marginBottom: 6 }}>建议补充的论据</div>
        <BulletList items={evidence.missingEvidence} emptyText="当前没有额外的论据补充建议。" />
      </Section>

      <Section title="逻辑连贯性分析" subtitle="重点看段落之间是否顺，过渡是否自然，推理有没有跳步。">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
          <ScoreMetric label="段落连贯性" value={logic.coherence} description="各段之间衔接是否自然，推进是否清晰。" />
          <ScoreMetric label="过渡词使用" value={logic.transitionQuality} description="连接词和逻辑标志语是否准确、够用。" />
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: ANALYSIS_THEME.accent, marginBottom: 6 }}>逻辑问题提醒</div>
        <BulletList items={logic.flowIssues} emptyText="当前没有额外的逻辑连贯性问题提示。" />
      </Section>

      {vocabData.length > 0 ? (
        <Section title="议论文常用表达" subtitle="把可直接迁移到本题写作里的表达集中收在这里。">
          <AnalysisResourceGrid
            items={vocabData}
            renderItem={(scene, idx) => (
              <div
                key={idx}
                style={{
                  background: ANALYSIS_THEME.surface,
                  border: `1px solid ${ANALYSIS_THEME.border}`,
                  borderRadius: 0,
                  padding: '10px 12px',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: ANALYSIS_THEME.accent, marginBottom: 6 }}>
                  {scene.icon} {scene.category}
                </div>
                <VocabularyList words={scene.words} />
              </div>
            )}
          />
        </Section>
      ) : null}
    </AnalysisPage>
  );
}
