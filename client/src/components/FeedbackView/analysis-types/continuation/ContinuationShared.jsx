import useIsMobile from '../../../../hooks/useIsMobile.js';

export const PALETTE = {
  ink: '#2a1f14',
  subtle: '#8a7d6e',
  soft: '#a09080',
  line: '#e8e0d5',
  gold: '#8A6F5B',
  blue: '#5a7490',
  green: '#3a6a45',
  rose: '#9a5a6a',
  amber: '#9a7040',
};

export function Section({ title, subtitle, children }) {
  const isMobile = useIsMobile();
  const hPad = isMobile ? 10 : 14; // matches FeedbackAnalysisPanel outer padding

  return (
    <section style={{ display: 'grid', gap: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#f5f0e8',
        borderTop: '1px solid #d4c8b8',
        borderBottom: '1px solid #d4c8b8',
        padding: `9px ${12 + hPad}px`,
        margin: `0 -${hPad}px`,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#6b5a47', letterSpacing: '0.04em' }}>{title}</span>
      </div>
      {subtitle ? (
        <div style={{ fontSize: 12, lineHeight: 1.6, color: PALETTE.subtle, padding: '8px 12px 10px' }}>
          {subtitle}
        </div>
      ) : <div style={{ height: 10 }} />}
      {children}
    </section>
  );
}

export function SubTitle({ children, color = '#8A6F5B' }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 5, letterSpacing: '0.01em' }}>
      {children}
    </div>
  );
}

export function BulletList({ items = [], ordered = false, color = PALETTE.ink }) {
  if (!items.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {items.map((item, index) => (
        <div key={index} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <span style={{ minWidth: 14, color, fontWeight: 800, fontSize: 12 }}>{ordered ? `${index + 1}.` : '•'}</span>
          <div style={{ flex: 1, fontSize: 12, lineHeight: 1.65, color: PALETTE.ink }}>{item}</div>
        </div>
      ))}
    </div>
  );
}

export function SoftCard({ title, color = PALETTE.gold, children, accent = '#f5f0e8' }) {
  return (
    <div
      style={{
        padding: '8px 12px',
        borderRadius: 0,
        background: accent,
        border: `1px solid ${PALETTE.line}`,
        display: 'grid',
        gap: 6,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 800, color }}>{title}</div>
      {children}
    </div>
  );
}
