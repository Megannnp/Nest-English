import { useState } from 'react';

import AppIcon from '../../components/shared/AppIcon.jsx';
import useIsMobile from '../../hooks/useIsMobile.js';

function getSourceModeButtonLabel(cardId) {
  return cardId === 'homework' ? '去提交作业' : '开始自主批改';
}

export default function SourceModeModal({ onSelect, sidebarWidth = 58 }) {
  const isMobile = useIsMobile();
  const [hovered, setHovered] = useState(null);
  const cards = [
    {
      id: 'homework',
      icon: 'clipboard',
      title: '提交作业',
      subtitle: 'Homework Submission',
      desc: '选择老师布置的题目 批改结果同步至教师端',
      bg: '#fdf0d8',
      border: '#f0cc80',
      btnBg: 'linear-gradient(135deg,#c8852a,#e8a840)',
      iconBg: '#fff8e6',
    },
    {
      id: 'self',
      icon: 'pen-line',
      title: '自主批改',
      subtitle: 'Self Practice',
      desc: '自由写作练习 仅保存至个人记录，不提交教师端',
      bg: '#f5f1eb',
      border: '#e8e0d5',
      btnBg: 'linear-gradient(135deg,#8b5e1a,#c8852a)',
      iconBg: '#faf8f5',
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9,
        background: 'rgba(42,31,20,0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: isMobile ? 0 : sidebarWidth,
        paddingRight: isMobile ? 12 : 0,
        paddingTop: isMobile ? 'calc(12px + env(safe-area-inset-top, 0px))' : 0,
        paddingBottom: isMobile ? 'calc(18px + env(safe-area-inset-bottom, 0px))' : 0,
        transition: 'padding-left 0.3s ease',
      }}
    >
      <div style={{ width: isMobile ? '100%' : 540, maxWidth: isMobile ? '100%' : '92vw' }}>
        <div style={{ textAlign: 'center', marginBottom: isMobile ? 16 : 24 }}>
          <div style={{ fontSize: isMobile ? 18 : 20, fontWeight: 800, color: '#fff', marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <AppIcon name="pencil" size={20} />选择批改方式
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: 14 }}>
          {cards.map((card) => {
            const buttonLabel = getSourceModeButtonLabel(card.id);

            return (
              <button
                type="button"
                key={card.id}
                onMouseEnter={() => setHovered(card.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect(card.id)}
                style={{
                  flex: 1,
                  borderRadius: isMobile ? 16 : 18,
                  padding: isMobile ? '18px 16px' : '24px 20px',
                  background: card.bg,
                  border: `2px solid ${hovered === card.id ? '#c8852a' : card.border}`,
                  cursor: 'pointer',
                  textAlign: 'left',
                  boxShadow: hovered === card.id
                    ? '0 8px 32px rgba(200,133,42,0.25)'
                    : '0 2px 12px rgba(0,0,0,0.08)',
                  transform: hovered === card.id ? 'translateY(-3px) scale(1.02)' : 'none',
                  transition: 'all 0.22s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                <div
                  style={{
                    width: isMobile ? 46 : 52,
                    height: isMobile ? 46 : 52,
                    borderRadius: isMobile ? 12 : 14,
                    background: card.iconBg,
                    border: `1.5px solid ${card.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                  }}
                >
                  <AppIcon name={card.icon} size={isMobile ? 22 : 26} />
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: isMobile ? 15 : 16, fontWeight: 800, color: '#2a1f14', marginBottom: 2 }}>
                    {card.title}
                  </div>
                  <div style={{ fontSize: 11, color: '#c8852a', fontWeight: 700, marginBottom: 8, letterSpacing: 0.5 }}>
                    {card.subtitle}
                  </div>
                  <div style={{ fontSize: isMobile ? 13 : 12, color: '#8a7d6e', lineHeight: 1.65, wordBreak: 'keep-all' }}>
                    {card.desc}
                  </div>
                </div>

                <button type="button"
                  aria-label={buttonLabel}
                  style={{
                    padding: isMobile ? '11px 0' : '10px 0',
                    borderRadius: 24,
                    border: 'none',
                    background: card.btnBg,
                    color: '#fff',
                    fontSize: isMobile ? 14 : 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(200,133,42,0.3)',
                    marginTop: 'auto',
                  }}
                >
                  {buttonLabel} →
                </button>
              </button>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>
          两种方式均可立刻获得完整 AI 批改报告
        </div>
      </div>
    </div>
  );
}
