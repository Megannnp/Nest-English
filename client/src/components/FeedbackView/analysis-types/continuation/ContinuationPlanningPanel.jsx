import { useMemo } from 'react';

import { BulletList, PALETTE, SubTitle } from './ContinuationShared.jsx';

function asList(value) {
  return Array.isArray(value) ? value : [];
}

function selectList(primary, fallback) {
  return primary.length ? primary : fallback;
}

function starterDirections(starters, key) {
  return asList(starters?.[key]?.directions);
}

function para1Motivation(storyLine) {
  return storyLine?.why
    ? `先围绕“${storyLine.why}”展开，让第一段有明确冲突或动机。`
    : '先围绕“老师为什么不纠错”展开，让第一段有明确冲突或动机。';
}

function para1Progress(resultFocus) {
  return resultFocus
    ? `推进方向：${resultFocus}。`
    : '推进人物经历一个具体的行动或对话，让故事向前发展。';
}

function para2Closure(resultFocus) {
  return resultFocus
    ? `走向主题升华：${resultFocus}。`
    : '完成情节收束，让人物有具体的感受或认识作为结尾。';
}

function buildFallbackPara1(storyLine, resultFocus) {
  return [
    para1Motivation(storyLine),
    para1Progress(resultFocus),
    '第一段结尾为第二段首句做铺垫，确保段落衔接合理。',
  ];
}

function buildFallbackPara2(resultFocus) {
  return [
    '把上一段的推进具体化——用对话、动作、细节，而非空洞概括。',
    para2Closure(resultFocus),
    '结尾要既有结果，也有成长回扣，让续写与原文主题形成完整闭环。',
  ];
}

function buildMainline(contentAnalysis) {
  return [
    contentAnalysis?.plotLogic?.accuracy || '全程紧扣原文主题，情节推进要有内在逻辑，不要脱离原文设定乱编情节。',
    contentAnalysis?.characterConsistency?.motivation || '人物情绪链要完整，变化需要有铺垫，不要直接跳到结果，略去转变过程。',
    contentAnalysis?.plotLogic?.closure || '结尾既有具体情节结果，也有主题感悟回扣，让续写与原文立意形成完整闭环。',
  ];
}

function StarterUnderstanding({ starters }) {
  const cards = [
    { key: 'para1', title: '第一段首句理解', color: PALETTE.rose },
    { key: 'para2', title: '第二段首句理解', color: PALETTE.amber },
  ];

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <SubTitle>首句理解</SubTitle>
        <div style={{ fontSize: 12, lineHeight: 1.6, color: PALETTE.subtle }}>
          不是只翻译段首句，而是明确每段应该承接什么、推进什么、回收到哪里。
        </div>
      </div>

      <div
        style={{
          display: 'inline-flex',
          width: 'fit-content',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          borderRadius: 0,
          background: '#f5f0e8',
          border: '1px solid #d4c8b8',
          fontSize: 13,
          lineHeight: 1.6,
          color: PALETTE.ink,
          fontWeight: 700,
        }}
      >
        <span style={{ color: PALETTE.gold }}>两段关系</span>
        <span>{starters?.relationship || '顺承'}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {cards.map((card) => {
          const current = starters?.[card.key] || {};
          return (
            <div
              key={card.key}
              style={{
                display: 'grid',
                gap: 7,
                paddingLeft: 12,
                borderLeft: `3px solid ${card.color}`,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: '#8A6F5B' }}>{card.title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.65, color: PALETTE.ink }}>
                <strong style={{ color: '#6b5a47', fontWeight: 700 }}>英文：</strong>{current.text || '未提供'}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.65, color: PALETTE.subtle }}>
                <strong style={{ color: '#6b5a47', fontWeight: 700 }}>中文：</strong>{current.translation || '暂无中文理解'}
              </div>
              {Array.isArray(current.constraints) && current.constraints.length ? (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8A6F5B', marginBottom: 3 }}>这段必须承接</div>
                  <BulletList items={current.constraints.slice(0, 3)} color="#8A6F5B" />
                </div>
              ) : null}
              {Array.isArray(current.directions) && current.directions.length ? (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8A6F5B', marginBottom: 3 }}>建议推进方向</div>
                  <BulletList items={current.directions.slice(0, 3)} color="#8A6F5B" />
                </div>
              ) : null}
              {Array.isArray(current.forbidden) && current.forbidden.length ? (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#8A6F5B', marginBottom: 3 }}>不要这样跑偏</div>
                  <BulletList items={current.forbidden.slice(0, 2)} color="#8A6F5B" />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildStarterPlans({ storyLine, contentAnalysis, starters }) {
  const resultFocus = storyLine?.result || '';
  return {
    method: [
      '第一步：先定结局——确认故事和情感的落点，避免只写过程、没有收束。',
      '第二步：由第二段首句反推第一段结尾——第一段结尾要为第二段首句的出现做合理铺垫。',
      '第三步：填充第一段——先写情绪起点（延续原文状态），再推进转变，最后以具体行动或对话作为连接。',
      '第四步：补充四类细节——心理变化 + 动作神态 + 场景氛围 + 高分句型（非谓语/定语从句/状语从句），完成主题回扣。',
    ],
    para1: selectList(starterDirections(starters, 'para1'), buildFallbackPara1(storyLine, resultFocus)),
    para2: selectList(starterDirections(starters, 'para2'), buildFallbackPara2(resultFocus)),
    mainline: buildMainline(contentAnalysis),
  };
}

function WritingBlueprint({ starters, storyLine, contentAnalysis }) {
  const plans = useMemo(() => buildStarterPlans({ storyLine, contentAnalysis, starters }), [storyLine, contentAnalysis, starters]);
  const columns = [
    { title: '倒着写：四步规划', items: plans.method, ordered: true },
    { title: '第一段怎么写', items: plans.para1, ordered: true },
    { title: '第二段怎么写', items: plans.para2, ordered: true },
    { title: '最该守住的主线', items: plans.mainline, ordered: true },
  ];
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 4 }}>
        <SubTitle>续写建构</SubTitle>
        <div style={{ fontSize: 12, lineHeight: 1.6, color: PALETTE.subtle }}>
          先定结局和主题升华，再逆向反推两段承接逻辑，最后填充细节——避免只写结果、不写过程。
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: '#d4c8b8', border: '1px solid #d4c8b8' }}>
        {/* 左列：四步规划，跨三行 */}
        <div style={{ background: '#f5f0e8', padding: '10px 12px', display: 'grid', gap: 6, gridRow: '1 / 4', alignContent: 'start' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#8A6F5B' }}>{columns[0].title}</div>
          <BulletList items={columns[0].items} ordered={columns[0].ordered} color="#8A6F5B" />
        </div>
        {/* 右列：三格堆叠 */}
        {columns.slice(1).map((column) => (
          <div key={column.title} style={{ background: '#f5f0e8', padding: '10px 12px', display: 'grid', gap: 6, alignContent: 'start' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#8A6F5B' }}>{column.title}</div>
            <BulletList items={column.items} ordered={column.ordered} color="#8A6F5B" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ContinuationPlanningPanel({ starters, storyLine, contentAnalysis }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <StarterUnderstanding starters={starters} />
      <div style={{ height: 1, background: PALETTE.line }} />
      <WritingBlueprint starters={starters} storyLine={storyLine} contentAnalysis={contentAnalysis} />
    </div>
  );
}
