const TONES = {
  writing: { color: "#9a4f2f", bg: "#fff7ed", border: "#f0d4b8" },
  grammar: { color: "#5142b0", bg: "#f5f3ff", border: "#ded8fb" },
  reading: { color: "#1d8061", bg: "#eefbf5", border: "#cdebdc" },
  modules: { color: "#6f4c18", bg: "#fff9e8", border: "#ead9a8" },
};

const MODULE_LABELS = {
  reading: "阅读练习",
  "reading-paper": "阅读模拟卷",
  "reading-courses": "阅读课程",
  vocabulary: "词汇",
  vocab: "词汇闪卡",
  "vocab-reading": "阅读词汇",
  "vocab-writing": "写作词汇",
  listening: "模拟练习",
  "listening-basics": "基础辨音",
  "listening-advanced": "篇章精听",
  phonetics: "音素训练",
  "phonetics-syllable": "音节训练",
  "phonetics-sentence": "句子语音",
  "phonetics-discourse": "语篇语音",
  "writing-refine-sentence": "句子润色",
  "writing-refine-structure": "结构调整",
};

function DataStat({ label, value, helper }) {
  return (
    <div style={{ border: "1px solid #ebe3d8", borderRadius: 12, padding: "14px 16px", background: "#fffdfa" }}>
      <div style={{ fontSize: 12, color: "#8a7d6e", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: "#241a12", lineHeight: 1 }}>{value}</div>
      {helper ? <div style={{ fontSize: 12, color: "#a09080", marginTop: 7, lineHeight: 1.5 }}>{helper}</div> : null}
    </div>
  );
}

function DataPanel({ title, tone, children, badge }) {
  return (
    <section style={{ border: `1px solid ${tone.border}`, borderRadius: 14, background: "#fff", overflow: "hidden" }}>
      <div style={{ padding: "15px 18px", background: tone.bg, color: tone.color, display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <strong>{title}</strong>
        {badge ? <span style={{ fontSize: 12, fontWeight: 800 }}>{badge}</span> : null}
      </div>
      <div style={{ padding: "16px 18px", display: "grid", gap: 14 }}>
        {children}
      </div>
    </section>
  );
}

// 每条推荐返回 `{ text, taskType }`：text 用于展示/导出，taskType 用于
// 「一键创建对应作业」导航。taskType 是写作/语法/阅读等模块标识。
function completionRecommendation(overall, current) {
  const completionRate = Number(overall.completionRate || current.classSummary?.completionRate || 0);
  const needsFollowUp = Number(overall.pendingStudentCount || 0) > 0 || (completionRate > 0 && completionRate < 80);
  return needsFollowUp
    ? { text: "先处理待完成学生：按名单提醒补交，再安排一次短时重练。", taskType: "writing" }
    : null;
}

function lowAccuracyRecommendation(accuracy, message, taskType) {
  const value = Number(accuracy || 0);
  return value > 0 && value < 80 ? { text: message, taskType } : null;
}

function resolveModuleTaskType(moduleType = "") {
  if (moduleType.startsWith('phonetics')) return 'phonetics';
  if (moduleType === 'vocabulary' || moduleType === 'vocab') return 'vocab';
  if (moduleType.startsWith('listening')) return 'listening';
  if (moduleType.startsWith('reading')) return 'reading';
  if (moduleType.startsWith('writing')) return 'writing';
  return 'module';
}

function moduleRecommendation(current) {
  const weakModule = (current.modules?.realRecords || [])
    .filter((item) => Number(item.sessions || 0) > 0 && Number(item.averageAccuracy || 0) < 80)
    .sort((a, b) => Number(a.averageAccuracy || 0) - Number(b.averageAccuracy || 0))[0];
  return weakModule
    ? {
        text: `${MODULE_LABELS[weakModule.moduleType] || weakModule.moduleType} 平均正确率偏低，安排一次同模块定向练习。`,
        taskType: resolveModuleTaskType(weakModule.moduleType),
      }
    : null;
}

export function buildTeachingRecommendations({ overall = {}, current = {} }) {
  const items = [
    completionRecommendation(overall, current),
    lowAccuracyRecommendation(current.grammar?.accuracy, "语法正确率低于 80%，下节课优先讲同一语法点的错题判断依据。", "grammar"),
    lowAccuracyRecommendation(current.reading?.accuracy, "阅读正确率低于 80%，建议做错题复盘并回到文章结构分析。", "reading"),
    moduleRecommendation(current),
  ].filter(Boolean);
  return (items.length
    ? items
    : [{ text: "当前班级主线稳定：保持本周练习频率，并挑一个模块做拔高任务。", taskType: "module" }]
  ).slice(0, 3);
}

function getModuleCoverage(modules = {}) {
  const assigned = Array.isArray(modules.byModule) ? modules.byModule.filter((item) => Number(item.assignedCount || 0) > 0) : [];
  const practiced = Array.isArray(modules.realRecords) ? modules.realRecords.filter((item) => Number(item.sessions || 0) > 0) : [];
  return new Set([...assigned, ...practiced].map((item) => MODULE_LABELS[item.moduleType] || item.moduleType)).size;
}

function buildReportRisks({ pendingCount, grammarAccuracy, readingAccuracy, moduleCoverage }) {
  const risks = [
    pendingCount > 0 ? `仍有 ${pendingCount} 名学生待完成` : null,
    grammarAccuracy > 0 && grammarAccuracy < 80 ? "语法正确率低于 80%" : null,
    readingAccuracy > 0 && readingAccuracy < 80 ? "阅读正确率低于 80%" : null,
    moduleCoverage < 3 ? "专项模块覆盖不足" : null,
  ].filter(Boolean);
  return risks.length ? risks : ["当前班级暂无明显采购汇报风险"];
}

function getReportReadinessScore({ completionRate, grammarAccuracy, readingAccuracy, modulePracticeSessions, moduleCoverage, pendingCount }) {
  const readiness = [
    completionRate >= 80,
    grammarAccuracy >= 80,
    readingAccuracy >= 80,
    modulePracticeSessions >= 8 || moduleCoverage >= 3,
    pendingCount === 0,
  ].filter(Boolean).length;
  return Math.round((readiness / 5) * 100);
}

function getSchoolReportSummary({ overall = {}, current = {} }) {
  const completionRate = Number(overall.completionRate || current.classSummary?.completionRate || 0);
  const grammarAccuracy = Number(current.grammar?.accuracy || 0);
  const readingAccuracy = Number(current.reading?.accuracy || 0);
  const modulePracticeSessions = Number(current.modules?.realPracticeSessions || 0);
  const moduleCoverage = getModuleCoverage(current.modules);
  const pendingCount = Number(overall.pendingStudentCount || 0);
  return {
    readinessScore: getReportReadinessScore({ completionRate, grammarAccuracy, readingAccuracy, modulePracticeSessions, moduleCoverage, pendingCount }),
    risks: buildReportRisks({ pendingCount, grammarAccuracy, readingAccuracy, moduleCoverage }),
    moduleCoverage,
    modulePracticeSessions,
  };
}

function optionalWeakness(condition, message) {
  return condition ? message : null;
}

function buildClassWeaknesses({ overall = {}, current = {} }) {
  const pendingCount = Number(overall.pendingStudentCount || 0);
  const commentCoverage = Number(current.writing?.teacherCommentCoverageRate || 0);
  const grammarAccuracy = Number(current.grammar?.accuracy || 0);
  const readingAccuracy = Number(current.reading?.accuracy || 0);
  const moduleCoverage = getModuleCoverage(current.modules);
  return [
    optionalWeakness(pendingCount > 0, `完成缺口：${pendingCount} 名学生待完成`),
    optionalWeakness(commentCoverage > 0 && commentCoverage < 80, "写作反馈覆盖不足：教师点评未覆盖到多数提交"),
    optionalWeakness(grammarAccuracy > 0 && grammarAccuracy < 80, `语法薄弱：正确率 ${grammarAccuracy}%`),
    optionalWeakness(readingAccuracy > 0 && readingAccuracy < 80, `阅读薄弱：正确率 ${readingAccuracy}%`),
    optionalWeakness(moduleCoverage < 3, "专项覆盖不足：训练模块少于 3 个"),
  ].filter(Boolean).slice(0, 5);
}

function getStudentSegments(overall = {}) {
  const pending = Array.isArray(overall.pendingStudents) ? overall.pendingStudents : [];
  return [
    { label: "优先跟进", value: pending.length, helper: pending.length ? pending.map((student) => student.name).slice(0, 4).join("、") : "暂无" },
    { label: "观察提升", value: Number(overall.pendingStudentCount || 0) > 0 ? "有风险" : "稳定", helper: "结合完成率与正确率复盘" },
    { label: "可拔高", value: pending.length ? "待筛选" : "可安排", helper: "完成稳定后安排拓展任务" },
  ];
}

function ActionButton({ children, label, onClick }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} style={{ border: "1px solid #d8c4a8", background: "#fff", borderRadius: 8, padding: "10px 12px", color: "#6f431c", fontWeight: 900, cursor: "pointer", textAlign: "left" }}>
      {children}
    </button>
  );
}

export function SchoolReportPanel({ overall, current }) {
  const report = getSchoolReportSummary({ overall, current });
  return (
    <DataPanel title="校方采购报告摘要" tone={TONES.modules} badge={`说服力 ${report.readinessScore}%`}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        <DataStat label="报告完成度" value={`${report.readinessScore}%`} helper="完成率/正确率/覆盖面综合" />
        <DataStat label="覆盖模块" value={report.moduleCoverage} helper="专项任务与真实练习合并统计" />
        <DataStat label="真实练习" value={report.modulePracticeSessions} helper="词汇/听读/语音等留痕" />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {report.risks.map((item) => (
          <div key={item} style={{ border: "1px solid #f0e2c0", borderRadius: 10, padding: "10px 12px", background: "#fffdf6", color: "#3a2f24", fontSize: 13, fontWeight: 800, lineHeight: 1.6 }}>
            {item}
          </div>
        ))}
      </div>
      <div style={{ color: "#6b5a47", fontSize: 13, lineHeight: 1.7 }}>
        可直接用于年级组汇报：展示班级覆盖、学生完成、薄弱风险和下一步干预依据。
      </div>
    </DataPanel>
  );
}

export function ClassWeaknessPanel({ overall, current }) {
  const weaknesses = buildClassWeaknesses({ overall, current });
  return (
    <DataPanel title="班级弱点" tone={TONES.reading} badge={`${weaknesses.length || 1} 条信号`}>
      <div style={{ display: "grid", gap: 8 }}>
        {(weaknesses.length ? weaknesses : ["当前班级没有明显短板，建议进入拔高练习。"]).map((item) => (
          <div key={item} style={{ border: "1px solid #cdebdc", borderRadius: 10, padding: "10px 12px", background: "#f7fffb", color: "#235243", fontSize: 13, fontWeight: 800, lineHeight: 1.6 }}>
            {item}
          </div>
        ))}
      </div>
    </DataPanel>
  );
}

export function StudentSegmentsPanel({ overall }) {
  const segments = getStudentSegments(overall);
  return (
    <DataPanel title="学生分层" tone={TONES.grammar} badge="用于分组干预">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {segments.map((segment) => (
          <DataStat key={segment.label} label={segment.label} value={segment.value} helper={segment.helper} />
        ))}
      </div>
    </DataPanel>
  );
}

function buildReportExportText({ overall = {}, current = {} }) {
  const summary = getSchoolReportSummary({ overall, current });
  const weaknesses = buildClassWeaknesses({ overall, current });
  const recommendations = buildTeachingRecommendations({ overall, current });
  return [
    `班级：${current.classSummary?.className || "未命名班级"}`,
    `报告完成度：${summary.readinessScore}%`,
    `完成率：${overall.completionRate || current.classSummary?.completionRate || 0}%`,
    `待完成学生：${overall.pendingStudentCount || 0}`,
    `覆盖模块：${summary.moduleCoverage}`,
    "",
    "班级弱点：",
    ...(weaknesses.length ? weaknesses : ["暂无明显短板"]),
    "",
    "教学建议：",
    ...recommendations.map((item) => item.text || item),
  ].join("\n");
}

const AMP = String.fromCharCode(38);
const LT = String.fromCharCode(60);
const GT = String.fromCharCode(62);
const QUOT = String.fromCharCode(34);
const APOS = String.fromCharCode(39);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll(AMP, `${AMP}amp;`)
    .replaceAll(LT, `${AMP}lt;`)
    .replaceAll(GT, `${AMP}gt;`)
    .replaceAll(QUOT, `${AMP}quot;`)
    .replaceAll(APOS, `${AMP}#39;`);
}

function buildReportPrintHtml({ overall = {}, current = {} }) {
  const summary = getSchoolReportSummary({ overall, current });
  const weaknesses = buildClassWeaknesses({ overall, current });
  const recommendations = buildTeachingRecommendations({ overall, current });
  const recommendationTexts = recommendations.map((item) => item.text || item);
  const className = current.classSummary?.className || "班级学情报告";
  const rows = [
    ["报告完成度", `${summary.readinessScore}%`],
    ["完成率", `${overall.completionRate || current.classSummary?.completionRate || 0}%`],
    ["待完成学生", overall.pendingStudentCount || 0],
    ["覆盖模块", summary.moduleCoverage],
    ["真实练习", summary.modulePracticeSessions],
  ];
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(className)}学情报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #241a12; margin: 40px; line-height: 1.7; }
    h1 { font-size: 28px; margin: 0 0 8px; }
    h2 { font-size: 18px; margin: 28px 0 10px; }
    .meta { color: #7a6b5b; margin-bottom: 24px; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0 24px; }
    td { border: 1px solid #e5d8c8; padding: 10px 12px; }
    td:first-child { width: 28%; background: #fff7ed; font-weight: 800; }
    li { margin: 6px 0; }
    @media print { body { margin: 24mm; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(className)}学情报告</h1>
  <div class="meta">用于年级组汇报、家校沟通和下一阶段教学干预。</div>
  <table>${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join("")}</table>
  <h2>班级弱点</h2>
  <ul>${(weaknesses.length ? weaknesses : ["暂无明显短板"]).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  <h2>学生分层</h2>
  <ul>${getStudentSegments(overall).map((item) => `<li><strong>${escapeHtml(item.label)}：</strong>${escapeHtml(item.value)}，${escapeHtml(item.helper)}</li>`).join("")}</ul>
  <h2>教学建议</h2>
  <ol>${recommendationTexts.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
</body>
</html>`;
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function openPrintReport({ overall, current }) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) return;
  printWindow.document.write(buildReportPrintHtml({ overall, current }));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

export function ExportMaterialsPanel({ overall, current }) {
  const reportText = buildReportExportText({ overall, current });
  const className = current.classSummary?.className || "class-report";
  return (
    <DataPanel title="导出材料" tone={TONES.writing} badge="校方/家校沟通">
      <div style={{ color: "#6b5a47", fontSize: 13, lineHeight: 1.7 }}>
        导出内容包含班级概况、弱点信号、学生分层和教学建议，可作为年级组汇报或家校沟通材料。
      </div>
      <ActionButton label="打印或保存学情报告 PDF" onClick={() => openPrintReport({ overall, current })}>
        打印 / 保存 PDF 报告
      </ActionButton>
      <ActionButton label="下载学情报告 TXT" onClick={() => downloadTextFile(`${className}-学情报告.txt`, reportText)}>
        下载学情报告 TXT
      </ActionButton>
    </DataPanel>
  );
}
