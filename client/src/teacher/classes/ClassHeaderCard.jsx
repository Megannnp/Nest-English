import { T } from './styles.js';

export default function ClassHeaderCard({
  selectedClass,
  isMobile = false,
  onEditPassword,
  onImportRoster = null,
}) {
  if (!selectedClass) return null;

  return (
    <div style={{ marginBottom: isMobile ? 14 : 18, padding: isMobile ? '0' : '2px 0 4px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.1, color: T.primaryDark, textTransform: 'uppercase', marginBottom: 8 }}>
        Class Profile
      </div>
      <div style={{ fontSize: isMobile ? 28 : 36, fontWeight: 900, color: T.text, marginBottom: 8, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
        {selectedClass.className}
      </div>
      <div
        style={{
          fontSize: 13,
          color: T.textMuted,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        <span>班级号：<strong style={{ color: T.primaryDark }}>{selectedClass.classCode}</strong></span>
        {!isMobile ? <span style={{ color: T.border }}>|</span> : null}
        <span>加入密码：<strong style={{ color: T.primaryDark }}>已隐藏</strong></span>
        <button
          onClick={onEditPassword}
          style={{
            fontSize: 11,
            color: T.primary,
            background: T.primaryLight,
            border: '1px solid #f0cc80',
            borderRadius: 12,
            padding: isMobile ? '4px 10px' : '2px 10px',
            cursor: 'pointer',
            alignSelf: isMobile ? 'flex-start' : 'auto',
          }}
        >
          修改密码
        </button>
        {onImportRoster ? (
          <button
            onClick={onImportRoster}
            style={{
              fontSize: 11,
              color: T.primary,
              background: T.primaryLight,
              border: '1px solid #f0cc80',
              borderRadius: 12,
              padding: isMobile ? '4px 10px' : '2px 10px',
              cursor: 'pointer',
              alignSelf: isMobile ? 'flex-start' : 'auto',
            }}
          >
            导入学生名单
          </button>
        ) : null}
        {!isMobile ? <span style={{ color: T.border }}>|</span> : null}
        <span>创建于 {new Date(selectedClass.createdAt).toLocaleDateString('zh-CN')}</span>
      </div>
    </div>
  );
}
