function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMetricRows(metrics = {}) {
  return [
    ["任务总数", metrics.totalStudents ?? 0],
    ["已提交", metrics.submittedCount ?? 0],
    ["已返回", metrics.returnedCount ?? 0],
    ["已完成率", metrics.completionRate || "0%"],
    ["教师评价覆盖率", metrics.teacherCommentCoverageRate || "0%"],
    ["详细反馈触发率", metrics.detailedFeedbackTriggerRate || "0%"],
    ["平均分", metrics.averageScore || "-"],
    ["最高分", metrics.maxScore || "-"],
    ["最低分", metrics.minScore || "-"],
    ["偏题人数", metrics.offTopicCount ?? 0],
    ["偏题占比", metrics.offTopicRate || "0%"],
    ["高风险人数", metrics.highRiskCount ?? 0],
    ["高风险占比", metrics.highRiskRate || "0%"],
  ];
}

function buildSectionCard(title, content) {
  return `
    <section class="section">
      <h2>${escapeHtml(title)}</h2>
      ${content}
    </section>
  `;
}

function formatTime(value) {
  return value ? escapeHtml(new Date(Number(value)).toLocaleString("zh-CN")) : "";
}

function buildOverviewSection(assignment) {
  return buildSectionCard("一、作业信息", `
      <div class="grid">
        <div class="box"><strong>作业名称：</strong>${escapeHtml(assignment.title || "未命名作业")}</div>
        <div class="box"><strong>班级：</strong>${escapeHtml(assignment.className || "未关联班级")}</div>
        <div class="box"><strong>状态：</strong>${escapeHtml(assignment.status || "draft")}</div>
        <div class="box"><strong>分值：</strong>${escapeHtml(assignment.maxScore || "")}</div>
        <div class="box span-2"><strong>截止时间：</strong>${assignment.dueAt ? formatTime(assignment.dueAt) : "未设置"}</div>
        <div class="box span-2"><strong>写作要求：</strong><div class="pre">${escapeHtml(assignment.promptText || "暂无")}</div></div>
      </div>
    `);
}

function buildStatsSection(summary) {
  return buildSectionCard("二、任务统计", `
      <div class="grid metric-grid">
        ${[
          ["待完成", summary.pendingCount ?? 0],
          ["批改中", summary.gradingCount ?? 0],
          ["已返回", summary.returnedCount ?? 0],
          ["已逾期", summary.overdueCount ?? 0],
        ].map(([label, value]) => `<div class="metric"><div class="metric-label">${escapeHtml(label)}</div><div class="metric-value">${escapeHtml(value)}</div></div>`).join("")}
      </div>
    `);
}

function buildSummarySection(metrics) {
  return buildSectionCard("三、班级汇总", `
      <table>
        <tbody>
          ${renderMetricRows(metrics).map(([label, value]) => `
            <tr>
              <th>${escapeHtml(label)}</th>
              <td>${escapeHtml(value)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `);
}

function renderDetailRows(rows, assignment) {
  if (!rows.length) return `<tr><td colspan="8">当前没有可导出的班级明细。</td></tr>`;
  return rows.map((row) => `
    <tr>
      <td>${escapeHtml(row.student_name || "")}</td>
      <td>${escapeHtml(row.account_code || "")}</td>
      <td>${escapeHtml(row.task_status || "")}</td>
      <td>${formatTime(row.submitted_at)}</td>
      <td>${row.latest_score == null ? "" : escapeHtml(`${row.latest_score} / ${assignment.maxScore || ""}`)}</td>
      <td>${escapeHtml(row.quick_feedback_status || "")}</td>
      <td>${escapeHtml(row.teacher_comment_status || "")}</td>
      <td>${escapeHtml(row.detailed_feedback_status || "")}</td>
    </tr>
  `).join("");
}

function buildDetailSection(rows, assignment) {
  return buildSectionCard("四、班级明细", `
      <table>
        <thead>
          <tr>
            <th>学生</th>
            <th>账号</th>
            <th>任务状态</th>
            <th>提交时间</th>
            <th>得分</th>
            <th>快速反馈</th>
            <th>教师评价</th>
            <th>详细反馈</th>
          </tr>
        </thead>
        <tbody>
          ${renderDetailRows(rows, assignment)}
        </tbody>
      </table>
    `);
}

function buildEnabledSections({ assignment, enabled, metrics, rows, summary }) {
  return [
    enabled.has("overview") ? buildOverviewSection(assignment) : "",
    enabled.has("stats") ? buildStatsSection(summary) : "",
    enabled.has("summary") ? buildSummarySection(metrics) : "",
    enabled.has("detail") ? buildDetailSection(rows, assignment) : "",
  ].filter(Boolean);
}

export function buildAssignmentPdfHtml({ payload, modules = [] }) {
  const assignment = payload?.assignment || {};
  const summary = payload?.summary || {};
  const metrics = payload?.metrics || {};
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const enabled = new Set(modules);
  const blocks = buildEnabledSections({ assignment, enabled, metrics, rows, summary });

  return `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(assignment.title || "作业导出")}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body { font-family: "Microsoft YaHei", "PingFang SC", sans-serif; color: #2a1f14; background: #fff; line-height: 1.75; font-size: 11pt; }
      h1 { font-size: 20pt; margin: 0 0 8px; }
      h2 { font-size: 14pt; margin: 0 0 12px; color: #8b5e1a; }
      .head { margin-bottom: 18px; }
      .sub { color: #8a7d6e; }
      .section { margin-top: 18px; page-break-inside: avoid; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .span-2 { grid-column: span 2; }
      .box { border: 1px solid #e8e0d5; border-radius: 10px; background: #faf8f5; padding: 10px 12px; }
      .pre { white-space: pre-wrap; margin-top: 6px; }
      .metric-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
      .metric { border: 1px solid #e8e0d5; border-radius: 10px; background: #faf8f5; padding: 10px 12px; }
      .metric-label { font-size: 10pt; color: #8a7d6e; margin-bottom: 4px; }
      .metric-value { font-size: 16pt; font-weight: 700; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #e8e0d5; padding: 8px 10px; text-align: left; vertical-align: top; }
      th { background: #faf8f5; color: #6f5d4d; }
      .print-hint { margin-top: 20px; font-size: 10pt; color: #8a7d6e; }
    </style>
  </head>
  <body>
    <div class="head">
      <h1>${escapeHtml(assignment.title || "作业导出")}</h1>
      <div class="sub">${escapeHtml(assignment.className || "未关联班级")} · 分值 ${escapeHtml(assignment.maxScore || "")}</div>
    </div>
    ${blocks.join("")}
    <div class="print-hint">打开系统打印面板后，选择“存储为 PDF”即可导出所勾选模块。</div>
    <script>setTimeout(() => window.print(), 400);</script>
  </body>
  </html>`;
}

export function exportAssignmentPdf({ payload, modules }) {
  const html = buildAssignmentPdfHtml({ payload, modules });
  const iframe = document.createElement("iframe");

  iframe.setAttribute("title", "作业 PDF 导出");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  document.body.appendChild(iframe);

  const printWindow = iframe.contentWindow || window;
  const printDocument = iframe.contentDocument || printWindow.document;

  printDocument.open();
  printDocument.write(html);
  printDocument.close();

  const hasWindowPrintStub = Object.prototype.hasOwnProperty.call(window, "print");
  const print = hasWindowPrintStub ? window.print : printWindow.print;
  const runPrint = () => {
    print?.call(print === window.print ? window : printWindow);
  };

  if (hasWindowPrintStub) {
    runPrint();
  } else {
    setTimeout(runPrint, 0);
  }

  return { mode: "iframe", iframe };
}
