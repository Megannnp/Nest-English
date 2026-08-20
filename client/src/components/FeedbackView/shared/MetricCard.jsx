
export default function MetricCard({ label, value, color = '#6b5a47', description, size = 'normal' }) {
  const isSmall = size === 'small';

  return (
    <div style={{
      padding: isSmall ? '10px 12px' : '12px 14px',
      background: '#f5f0e8',
      borderRadius: 0,
      border: '1px solid #d4c8b8',
      textAlign: 'center',
    }}>
      <div style={{
        width: isSmall ? 36 : 44,
        height: isSmall ? 36 : 44,
        margin: '0 auto 6px',
        borderRadius: '50%',
        background: '#ffffff',
        border: `2px solid ${color}`,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: isSmall ? 14 : 16,
        fontWeight: 800,
      }}>
        {value}
      </div>
      <div style={{
        fontWeight: 700,
        color: '#2a1f14',
        fontSize: isSmall ? 12 : 13,
        marginBottom: 3,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: isSmall ? 11 : 12,
        color: '#8a7d6e',
        lineHeight: 1.5,
      }}>
        {description}
      </div>
    </div>
  );
}
