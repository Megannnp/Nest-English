import { T } from './styles.js';

export default function ClassListPanel({
  classes = [],
  selectedClassId = null,
  isMobile = false,
  onSelectClass,
}) {
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {classes.map((cls) => (
          <button
            type="button"
            key={cls.id}
            onClick={() => onSelectClass?.(cls)}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 12,
              textAlign: 'left',
              cursor: 'pointer',
              background: T.card,
              border: `1.5px solid ${T.border}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: T.text, marginBottom: 4 }}>{cls.className}</div>
              <div style={{ fontSize: 12, color: T.textMuted }}>班级号：{cls.classCode}</div>
            </div>
            <span style={{ color: T.textMuted, fontSize: 16 }}>›</span>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {classes.map((cls) => (
        <button
          type="button"
          key={cls.id}
          onClick={() => onSelectClass?.(cls)}
          style={{
            width: '100%',
            padding: '16px 16px',
            borderRadius: 18,
            textAlign: 'left',
            cursor: 'pointer',
            background: selectedClassId === cls.id ? 'linear-gradient(180deg, #fff6e8 0%, #fff 100%)' : 'linear-gradient(180deg, #fffdfa 0%, #fff 100%)',
            border: `1.5px solid ${selectedClassId === cls.id ? T.primary : 'rgba(99, 74, 39, 0.1)'}`,
            transition: 'all 0.15s',
            boxShadow: selectedClassId === cls.id ? '0 16px 34px rgba(200, 133, 42, 0.15)' : '0 10px 24px rgba(99, 74, 39, 0.05)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.1, color: selectedClassId === cls.id ? T.primaryDark : T.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Class</div>
          <div style={{ fontSize: 15, fontWeight: 900, color: T.text, marginBottom: 4 }}>{cls.className}</div>
          <div style={{ fontSize: 11, color: T.textMuted }}>班级号：{cls.classCode}</div>
        </button>
      ))}
    </div>
  );
}
