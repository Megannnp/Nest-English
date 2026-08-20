import { useMemo, useState } from 'react';

import { T } from './styles.js';

const selectArrowStyle = {
  padding: '9px 38px 9px 12px',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9' fill='none'%3E%3Cpath d='M1 1.5L7 7.5L13 1.5' stroke='%238a7d6e' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  backgroundSize: '14px 9px',
};

function sameId(left, right) {
  return String(left) === String(right);
}

export default function ClassStudentsPanel({
  loading = false,
  students = [],
  writings = [],
  classCode = '',
  open = false,
  onToggle,
  isMobile = false,
  onOpenWriting = null,
}) {
  const [query, setQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [taskFilter, setTaskFilter] = useState('all');

  const filteredStudents = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return students;
    return students.filter((student) => (
      [student.realName, student.name, student.email]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword))
    ));
  }, [query, students]);

  const selectedStudent = useMemo(() => {
    if (!filteredStudents.length) return null;
    const matched = filteredStudents.find((student) => sameId(student.id, selectedStudentId));
    return matched || filteredStudents[0];
  }, [filteredStudents, selectedStudentId]);

  const selectedStudentWritings = useMemo(() => {
    if (!selectedStudent?.id) return [];
    return writings.filter((writing) => sameId(writing.userId, selectedStudent.id));
  }, [selectedStudent, writings]);

  const taskOptions = useMemo(() => {
    const taskMap = new Map();
    selectedStudentWritings.forEach((writing) => {
      const value = String(writing.assignmentId || writing.assignmentTitle || writing.writingTitle || writing.id);
      const label = writing.assignmentTitle || writing.writingTitle || '未命名任务';
      if (!taskMap.has(value)) {
        taskMap.set(value, { value, label });
      }
    });
    return Array.from(taskMap.values());
  }, [selectedStudentWritings]);

  const visibleStudentWritings = useMemo(() => {
    if (taskFilter === 'all') return selectedStudentWritings;
    return selectedStudentWritings.filter((writing) => (
      String(writing.assignmentId || writing.assignmentTitle || writing.writingTitle || writing.id) === taskFilter
    ));
  }, [selectedStudentWritings, taskFilter]);

  return (
    <div
      style={{
        background: 'linear-gradient(180deg, #fffdfa 0%, #faf7f1 100%)',
        borderRadius: 20,
        border: `1px solid ${T.border}`,
        padding: '16px 18px',
        userSelect: 'none',
        boxShadow: '0 10px 24px rgba(99,74,39,0.05)',
      }}
    >
      <button type="button" aria-expanded={open} onClick={() => onToggle?.(!open)} style={{ width: '100%', border: 0, padding: 0, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: T.primary }}>{students.length}</span>
          <span style={{ fontSize: 14, color: T.textSecondary }}>学生人数</span>
        </div>
        <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 700 }}>查看名单 {open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 12, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
          {loading ? (
            <div style={{ fontSize: 13, color: T.textMuted, textAlign: 'center', padding: '8px 0' }}>加载中...</div>
          ) : students.length === 0 ? (
            <div style={{ fontSize: 13, color: T.textMuted, textAlign: 'center', padding: '8px 0' }}>
              暂无学生，分享班级号邀请学生加入：<strong style={{ color: T.primaryDark }}> {classCode}</strong>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'minmax(240px, 300px) minmax(0, 1fr)',
                gap: 12,
                alignItems: 'start',
              }}
            >
              <div
                style={{
                  background: T.card,
                  borderRadius: 16,
                  border: `1px solid ${T.border}`,
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <input
                  aria-label="搜索学生"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜索学生姓名或邮箱"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: `1px solid ${T.border}`,
                    background: T.cardAlt,
                    color: T.text,
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredStudents.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => setSelectedStudentId(String(student.id))}
                      style={{
                        width: '100%',
                        padding: '12px 12px',
                        borderRadius: 14,
                        border: sameId(student.id, selectedStudent?.id) ? `1px solid ${T.primary}` : `1px solid ${T.border}`,
                        background: sameId(student.id, selectedStudent?.id) ? '#fff8ee' : T.cardAlt,
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
                        {student.realName || student.name}
                      </div>
                      <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.6, marginTop: 4, wordBreak: 'break-all' }}>
                        {student.email}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <StudentRecordCard
                student={selectedStudent}
                writings={visibleStudentWritings}
                taskFilter={taskFilter}
                taskOptions={taskOptions}
                onChangeTaskFilter={setTaskFilter}
                isMobile={isMobile}
                onOpenWriting={onOpenWriting}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StudentRecordCard({
  student,
  writings = [],
  taskFilter = 'all',
  taskOptions = [],
  onChangeTaskFilter = null,
  isMobile = false,
  onOpenWriting = null,
}) {
  if (!student) {
    return (
      <div
        style={{
          background: T.card,
          borderRadius: 16,
          border: `1px solid ${T.border}`,
          padding: '20px 18px',
          fontSize: 13,
          color: T.textMuted,
          lineHeight: 1.8,
        }}
      >
        当前筛选下没有学生，换个关键词试试。
      </div>
    );
  }

  return (
    <div
      style={{
        background: T.card,
        borderRadius: 16,
        border: `1px solid ${T.border}`,
        overflow: 'hidden',
        boxShadow: '0 10px 24px rgba(99,74,39,0.05)',
      }}
    >
      <div
        style={{
          padding: isMobile ? '14px 14px' : '16px 16px',
          display: 'flex',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: 10,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.1, color: T.primary, textTransform: 'uppercase' }}>
            Student Record
          </div>
          <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: T.text }}>
            {student.realName || student.name}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, color: T.textMuted, lineHeight: 1.6, wordBreak: 'break-all' }}>
            {student.email}
          </div>
        </div>
        <div style={{ fontSize: 12, color: T.textMuted, whiteSpace: 'nowrap' }}>
          提交 {writings.length} 篇
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, padding: isMobile ? '10px 12px 12px' : '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {taskOptions.length > 1 ? (
          <select
            value={taskFilter}
            onChange={(e) => onChangeTaskFilter?.(e.target.value)}
            style={{
              width: isMobile ? '100%' : 220,
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: T.cardAlt,
              color: T.text,
              fontSize: 12,
              outline: 'none',
              ...selectArrowStyle,
            }}
          >
            <option value="all">全部任务</option>
            {taskOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : null}
        {writings.length === 0 ? (
          <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.7 }}>
            这个学生目前还没有提交记录。
          </div>
        ) : writings.map((writing) => (
          <div
            key={writing.id}
            style={{
              borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: T.cardAlt,
              padding: '10px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 10,
              alignItems: isMobile ? 'flex-start' : 'center',
              flexDirection: isMobile ? 'column' : 'row',
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text, lineHeight: 1.6 }}>
                {writing.writingTitle || '未命名写作'}
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.7 }}>
                {new Date(writing.createdAt).toLocaleDateString('zh-CN')}
                {writing.feedback?.totalScore !== undefined ? ` · ${writing.feedback.totalScore}/${writing.feedback.maxScore || 15} 分` : ' · 暂无 AI 结果'}
              </div>
            </div>
            <button
              onClick={() => onOpenWriting?.({ writingId: writing.id, classId: writing.classId || null, tab: 'all' })}
              style={{
                padding: '7px 14px',
                borderRadius: 999,
                border: 'none',
                background: `linear-gradient(135deg, ${T.primary}, #e8a840)`,
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              查看作文
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
