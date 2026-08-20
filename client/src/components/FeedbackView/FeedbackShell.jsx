import { THEME } from './feedbackAdapter.js';

// Inject keyframes once per page load — avoids a duplicate <style> tag per ShimmerBlock instance.
if (typeof document !== 'undefined' && !document.querySelector('style[data-feedback-shimmer]')) {
  const s = document.createElement('style');
  s.setAttribute('data-feedback-shimmer', '1');
  s.textContent = '@keyframes feedbackShimmer{0%{background-position:100% 0}100%{background-position:-120% 0}}';
  document.head.appendChild(s);
}

export function Card({ children, style }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.92)',
      borderRadius: 24,
      border: '1px solid rgba(126, 90, 45, 0.13)',
      overflow: 'hidden',
      boxShadow: '0 18px 42px rgba(73, 49, 22, 0.07)',
      ...style
    }}>
      {children}
    </div>
  );
}

export function ShimmerBlock({ height = 16, width = '100%', radius = 2 }) {
  return (
    <div
      style={{
        height,
        width,
        borderRadius: radius,
        background: 'linear-gradient(90deg, #efe4d7 0%, #f8efe4 45%, #efe4d7 100%)',
        backgroundSize: '220% 100%',
        animation: 'feedbackShimmer 1.6s ease-in-out infinite',
      }}
    />
  );
}

export function SkeletonPanel({ children, style }) {
  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: 22,
        border: '1px solid rgba(126, 90, 45, 0.13)',
        padding: 14,
        boxShadow: '0 14px 34px rgba(73, 49, 22, 0.06)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function SectionHeader({ title, subtitle }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      background: 'linear-gradient(90deg, #fff7ea, #f5f0e8)',
      borderTop: '1px solid rgba(126, 90, 45, 0.12)',
      borderBottom: '1px solid rgba(126, 90, 45, 0.12)',
      padding: '9px 16px',
    }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#6b5a47', letterSpacing: '0.04em' }}>{title}</span>
      {subtitle && <span style={{ fontSize: 11, color: '#8a7d6e' }}>{subtitle}</span>}
    </div>
  );
}

export function GenerationProgress({ generation }) {
  if (!generation?.active) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.primaryDark }}>
          AI批改生成中
          <span style={{ marginLeft: 8, fontWeight: 700, color: THEME.textSecondary }}>{generation.stage || '正在组织反馈内容'}</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 800, color: '#6b5a47' }}>{generation.progress || 0}%</div>
      </div>
      <div style={{ height: 4, borderRadius: 0, background: '#e8e0d5', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${generation.progress || 0}%`,
            background: 'linear-gradient(90deg, #6b5a47, #a09080)',
            transition: 'width 0.35s ease',
            borderRadius: 0,
          }}
        />
      </div>
    </div>
  );
}

export function TabButton({ active, label, sub, icon, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={label}
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 16px',
        borderRadius: 999,
        border: `1px solid ${active ? '#d4c8b8' : '#e8e0d5'}`,
        borderBottom: `1px solid ${active ? '#d4c8b8' : '#e8e0d5'}`,
        cursor: 'pointer',
        background: active ? 'linear-gradient(135deg, #2a221b, #7b542c)' : '#ffffff',
        boxShadow: active ? '0 12px 28px rgba(73, 49, 22, 0.14)' : 'none',
        transition: 'all 0.2s ease',
        position: 'relative',
        minHeight: 56,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        <div style={{ fontSize: 13, opacity: active ? 1 : 0.72 }}>{icon}</div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: active ? 800 : 700, color: active ? '#fffaf1' : THEME.textSecondary, marginBottom: 1 }}>
            {label}
          </div>
          <div style={{ fontSize: 11, color: active ? 'rgba(255,250,241,0.68)' : '#b8a99a', letterSpacing: '0.1px' }}>{sub}</div>
        </div>
      </div>
    </button>
  );
}

export function SubTabButton({ active, label, sub, onClick }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-label={label}
      onClick={onClick}
      style={{
        flex: 1,
        padding: '10px 14px',
        borderRadius: 999,
        border: `1px solid ${active ? '#d4c8b8' : '#e8e0d5'}`,
        borderBottom: `1px solid ${active ? '#d4c8b8' : '#e8e0d5'}`,
        background: active ? 'linear-gradient(135deg, #2a221b, #7b542c)' : '#ffffff',
        color: active ? '#fffaf1' : THEME.textSecondary,
        fontWeight: 700,
        cursor: 'pointer',
        textAlign: 'left',
        boxShadow: active ? '0 12px 28px rgba(73, 49, 22, 0.14)' : 'none',
      }}
    >
      <div style={{ fontSize: 13, marginBottom: 2, fontWeight: active ? 800 : 700, lineHeight: 1.2 }}>{label}</div>
      <div style={{ fontSize: 11, marginTop: 1, color: active ? 'rgba(255,250,241,0.68)' : '#b8a99a', lineHeight: 1.45 }}>{sub}</div>
    </button>
  );
}
