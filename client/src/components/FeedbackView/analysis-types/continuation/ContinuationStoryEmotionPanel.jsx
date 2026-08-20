import { useMemo } from 'react';

import { PALETTE } from './ContinuationShared.jsx';
import useIsMobile from '../../../../hooks/useIsMobile.js';

const STORY_ITEMS = [
  { key: 'who', label: '人物', color: PALETTE.blue },
  { key: 'when', label: '时间', color: PALETTE.rose },
  { key: 'where', label: '地点', color: PALETTE.green },
  { key: 'why', label: '起因', color: PALETTE.amber },
  { key: 'what', label: '经过', color: PALETTE.ink },
  { key: 'result', label: '续写方向', color: PALETTE.blue },
];

function formatStoryItemValue(key, value) {
  const text = String(value || '').trim();
  if (!text) return '暂无分析内容';
  return text;
}

function buildGenreStoryTimeline(storyLine = {}) {
  const orderedItems = STORY_ITEMS.filter((item) => ['why', 'what', 'result'].includes(item.key));

  return orderedItems.map((item) => ({
    key: item.key,
    label: item.label,
    text: formatStoryItemValue(item.key, storyLine?.[item.key]),
    color: item.color,
  }));
}

function buildEmotionTimeline(emotionLine = {}) {
  const changes = Array.isArray(emotionLine?.changes) ? emotionLine.changes : [];
  return [
    { key: 'initial', label: '起点', text: emotionLine?.initial || '暂无情绪起点分析', color: PALETTE.rose },
    ...changes.map((item, index) => ({
      key: `change-${index}`,
      label: `变化 ${index + 1}`,
      text: item,
      color: PALETTE.rose,
    })),
    { key: 'tone', label: '基调', text: emotionLine?.tone || '暂无情感基调分析', color: PALETTE.rose },
  ];
}

function VerticalAxis({ title, items = [], activeKeys = [], accent = PALETTE.blue, onSelectItem }) {
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: accent }}>{title}</div>
      <div style={{ position: 'relative', paddingLeft: 24, display: 'grid', gap: 12 }}>
        <div style={{ position: 'absolute', left: 8, top: 6, bottom: 6, width: 2, background: `${accent}55` }} />
        {items.map((item, index) => {
          const active = activeKeys.includes(item.key) || activeKeys.includes(index);
          return (
            <button
              key={item.key || index}
              type="button"
              onClick={() => onSelectItem?.(item, index)}
              style={{
                position: 'relative',
                padding: '0 0 0 6px',
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                cursor: onSelectItem ? 'pointer' : 'default',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: -20,
                  top: 6,
                  width: 12,
                  height: 12,
                  borderRadius: 999,
                  background: active ? accent : '#fff',
                  border: `2px solid ${accent}`,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ fontSize: 12, fontWeight: 800, color: active ? accent : PALETTE.subtle, marginBottom: 4 }}>{item.label}</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: PALETTE.ink }}>{item.text}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function ContinuationStoryEmotionPanel({
  storyLine,
  emotionLine,
  activeStoryKeys,
  activeEmotionKeys,
  onSelectStoryNode,
  onSelectEmotionNode,
}) {
  const isMobile = useIsMobile();
  const storyTimeline = useMemo(() => buildGenreStoryTimeline(storyLine), [storyLine]);
  const emotionTimeline = useMemo(() => buildEmotionTimeline(emotionLine), [emotionLine]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: 16, alignItems: 'start' }}>
      <div style={{ display: 'grid', gap: 16 }}>
        <VerticalAxis
          title="故事线"
          items={storyTimeline}
          activeKeys={activeStoryKeys}
          accent={PALETTE.blue}
          onSelectItem={onSelectStoryNode}
        />
      </div>
      <div style={{ display: 'grid', gap: 16 }}>
        <VerticalAxis
          title="情感线"
          items={emotionTimeline}
          activeKeys={activeEmotionKeys}
          accent={PALETTE.rose}
          onSelectItem={onSelectEmotionNode}
        />
      </div>
    </div>
  );
}
