import AppIcon from '../../components/shared/AppIcon.jsx';
import { inp } from '../../constants/index.jsx';

const selectStyle = {
  ...inp(),
  padding: '12px 42px 12px 14px',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9' fill='none'%3E%3Cpath d='M1 1.5L7 7.5L13 1.5' stroke='%238a7d6e' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 14px center',
  backgroundSize: '14px 9px',
};

function sameId(left, right) {
  return String(left) === String(right);
}

export default function TeacherSubstitutePanel({
  isMobile = false,
  open,
  onToggle,
  selectedStudent,
  selectedClass,
  onSelectClass,
  onSelectStudent,
  classes = [],
  studentsInClass = [],
}) {
  return (
    <div
      style={{
        border: '1px solid #ece6de',
        borderRadius: 18,
        background: '#fff',
        overflow: 'hidden',
        boxShadow: '0 8px 26px rgba(60,40,10,0.06)',
      }}
    >
      <button type="button"
        onClick={() => onToggle((current) => !current)}
        style={{
          width: '100%',
          padding: isMobile ? '14px 16px' : '15px 20px',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AppIcon name="file-text" size={15} />
          <span style={{ fontSize: 14, color: '#3a2a18', fontWeight: 600 }}>
            {isMobile ? '代学生上传' : 'Substitute Upload · 代学生上传'}
          </span>
          {selectedStudent && (
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 10,
                background: '#edfaf3',
                color: '#1a7a4a',
              }}
            >
              已选择学生
            </span>
          )}
        </div>
        <span
          style={{
            color: '#a09080',
            fontSize: 11,
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          style={{
            padding: isMobile ? 16 : 20,
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 12 : 14,
            borderTop: '1px solid #ece6de',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: '#7c5c2e', display: 'block', marginBottom: 5 }}>
                选择班级
              </label>
              <select value={selectedClass} onChange={(e) => onSelectClass(e.target.value)} style={selectStyle}>
                <option value="">--选择班级--</option>
                {classes.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.className}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#7c5c2e', display: 'block', marginBottom: 5 }}>
                选择学生
              </label>
              <select
                value={selectedStudent}
                onChange={(e) => onSelectStudent(e.target.value)}
                disabled={!selectedClass}
                style={selectStyle}
              >
                <option value="">--选择学生--</option>
                {studentsInClass.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.realName || student.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedStudent && (
            <div style={{ fontSize: 13, color: '#b06000' }}>
              ✓ 将为{' '}
              <strong>{studentsInClass.find((student) => sameId(student.id, selectedStudent))?.realName}</strong>{' '}
              提交写作
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              padding: '10px 14px',
              background: '#fff',
              borderRadius: 10,
              border: '1px solid #e8e0d5',
            }}
          >
            <AppIcon name="layers" size={18} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2a1f14', marginBottom: 4 }}>
                整班上传与统一处理请回到教师工作台
              </div>
              <div style={{ fontSize: 12, color: '#8a7d6e', lineHeight: 1.7 }}>
                这里保留的是单篇代学生上传流程。批量代传、考试上传和异常处理，建议在工作台的上传区与待办区完成。
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
