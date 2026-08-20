// components/FeedbackView/shared/VocabularyList.jsx
import { useState } from 'react';

// 词性标签颜色映射 — 暖色系
const POS_COLORS = {
  'n.':      '#5a7490',  // 名词 - 灰蓝
  'v.':      '#9a3a2a',  // 动词 - 暖红
  'adj.':    '#3a6a45',  // 形容词 - 暖绿
  'adv.':    '#8A6F5B',  // 副词 - 暖棕
  'phrase':  '#6b5a47',  // 短语 - 主色
  'prep.':   '#7a5a70',  // 介词 - 暖紫
  'conj.':   '#4a6a78',  // 连词 - 暖青
  'default': '#8a7d6e'   // 默认 - 暖灰
};

function VocabItemDifficulty({ difficulty }) {
  if (!difficulty) return null;
  return (
    <span style={{
      padding: '1px 5px',
      background: difficulty === 'hard' ? '#fdf5f3' : '#f5f0e8',
      color: difficulty === 'hard' ? '#9a3a2a' : '#8A6F5B',
      borderRadius: 2,
      fontSize: 11,
      fontWeight: 700,
      border: `1px solid ${difficulty === 'hard' ? '#e0b8b0' : '#d4c8b8'}`,
    }}>
      {difficulty === 'hard' ? '难' : '重点'}
    </span>
  );
}

function VocabItemExample({ item, showExample, isExpanded }) {
  if (!isExpanded || !showExample || (!item.example && !item.sentence)) return null;
  return (
    <div style={{
      marginTop: 8,
      paddingTop: 8,
      borderTop: '1px dashed #e8e0d5',
      fontSize: 12,
      color: '#8a7d6e',
      lineHeight: 1.65
    }}>
      <div style={{ marginBottom: 3, fontWeight: 700, color: '#3a6a45', fontSize: 11 }}>
        例句：
      </div>
      <div style={{ fontFamily: 'Georgia, serif', marginBottom: 3, color: '#4a3928' }}>
        {item.example || item.sentence}
      </div>
      {(item.exampleCn || item.sentenceCn) && (
        <div style={{ color: '#8a7d6e' }}>
          {item.exampleCn || item.sentenceCn}
        </div>
      )}
    </div>
  );
}

export default function VocabularyList({
  words,
  showExample = true,
  compact = false
}) {
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = (index) => {
    setExpandedItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (!words || words.length === 0) {
    return <div style={{ color: '#8a7d6e', textAlign: 'center', padding: '16px' }}>暂无词汇推荐</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {words.map((item, index) => {
        const posColor = POS_COLORS[item.pos] || POS_COLORS['default'];
        const isExpanded = expandedItems[index];

        return (
          <button
            type="button"
            key={index}
            onClick={() => toggleExpand(index)}
            style={{
              width: '100%',
              padding: compact ? '8px 10px' : '12px 14px',
              background: '#ffffff',
              borderRadius: 0,
              border: '1px solid #e8e0d5',
              borderLeft: `3px solid ${posColor}`,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {/* 词汇头部 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{
                display: 'inline-block',
                padding: '1px 6px',
                background: `${posColor}18`,
                color: posColor,
                borderRadius: 2,
                fontSize: 11,
                fontWeight: 700,
                minWidth: '36px',
                textAlign: 'center',
                fontFamily: 'monospace',
                flexShrink: 0,
              }}>
                {item.pos || 'phrase'}
              </span>
              <span style={{ fontWeight: 700, fontFamily: 'Georgia, serif', fontSize: 13, color: '#2a1f14', flex: 1 }}>
                {item.word || item.en}
              </span>
              <span style={{ fontSize: 13, color: '#6b5a47', fontWeight: 700 }}>
                {item.meaning || item.cn}
              </span>
              <VocabItemDifficulty difficulty={item.difficulty} />
            </div>
            <VocabItemExample item={item} showExample={showExample} isExpanded={isExpanded} />
          </button>
        );
      })}
    </div>
  );
}
