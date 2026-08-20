import { classesAPI } from '../../api/index.js';

export function sameId(left, right) {
  return String(left) === String(right);
}

export function parseClassRosterText(rawText) {
  return String(rawText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const normalizedLine = line.replace(/\t/g, ',').replace(/，/g, ',');
      const parts = normalizedLine.split(',').map((item) => item.trim());
      if (index === 0 && (parts[0] === '学号' || parts[0]?.toLowerCase?.() === 'id')) return null;

      const [studentNo = '', studentName = ''] = parts;
      if (!studentNo || !studentName) {
        throw new Error(`第 ${index + 1} 行格式不正确，请按"学号,姓名"填写`);
      }

      return { studentNo, studentName };
    })
    .filter(Boolean);
}

export async function readClassRosterFile(file) {
  if (!file) return '';

  const name = file.name || '';
  const isExcel = /\.(xlsx|xls)$/i.test(name);
  if (isExcel) {
    const readXlsxFile = (await import('read-excel-file/browser')).default;
    const rows = await readXlsxFile(file);
    return rows
      .filter((row) => row.some((cell) => cell !== null && cell !== ''))
      .map((row) => row.map((cell) => {
        if (cell === null) return '';
        if (cell instanceof Date) return cell.toISOString().slice(0, 10);
        return String(cell);
      }).join(','))
      .join('\n');
  }

  return file.text();
}

export function downloadClassRosterTemplate() {
  const content = '\uFEFF学号,姓名\n01,张小明\n02,李华\n';
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'student-roster-template.csv';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function fetchClassRosterSnapshot(classId) {
  const [students, rosterEntries, unmatchedStudents, classWritingRecords] = await Promise.all([
    classesAPI.getStudents(classId).catch(() => []),
    classesAPI.getRoster(classId).catch(() => []),
    classesAPI.getUnmatchedUsers(classId).catch(() => []),
    classesAPI.getWritings(classId).catch(() => []),
  ]);

  return {
    students,
    rosterEntries,
    unmatchedStudents,
    classWritingRecords,
  };
}
