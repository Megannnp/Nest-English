import { buildBatchSummaryExportData } from './batch-grading-report-data.js';

export { buildBatchSummaryExportData } from './batch-grading-report-data.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildBatchSummaryReportHtml({ items = [], title = '', className = '' }) {
  const data = buildBatchSummaryExportData({ items, title, className });

  return `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(data.title)}</title>
    <style>
      @page { size: A4; margin: 10mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Microsoft YaHei", "PingFang SC", sans-serif;
        color: #2a1f14;
        background: #fff;
      }
      .page {
        padding: 0;
      }
      .header {
        border: 1px solid #e8d9c6;
        border-radius: 14px;
        padding: 14px 16px;
        background: #fffaf2;
        margin-bottom: 12px;
      }
      .title { font-size: 16pt; font-weight: 800; margin: 0 0 6px; color: #8b5e1a; }
      .meta { font-size: 9pt; color: #6b5a4d; line-height: 1.5; }
      .stats {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        gap: 8px;
        margin: 12px 0;
      }
      .stat {
        border: 1px solid #eadcc9;
        border-radius: 12px;
        padding: 10px 8px;
        text-align: center;
        background: #fff;
      }
      .stat-label { font-size: 8pt; color: #7b6b5d; margin-bottom: 4px; }
      .stat-value { font-size: 14pt; font-weight: 800; color: #2a1f14; }
      .section {
        margin-top: 10px;
        border: 1px solid #eadcc9;
        border-radius: 12px;
        overflow: hidden;
      }
      .section-title {
        margin: 0;
        padding: 10px 12px;
        background: #fff7ed;
        border-bottom: 1px solid #eadcc9;
        font-size: 10pt;
        font-weight: 800;
        color: #8b5e1a;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th, td {
        border-bottom: 1px solid #f0e4d4;
        padding: 8px 10px;
        vertical-align: top;
        text-align: left;
        font-size: 8.2pt;
        line-height: 1.35;
      }
      th {
        background: #fffdf9;
        color: #6b5a4d;
        font-weight: 700;
      }
      .issue-list {
        margin: 0;
        padding: 10px 14px 12px 26px;
        font-size: 8.6pt;
        line-height: 1.5;
      }
      .issue-list li { margin: 3px 0; }
    </style>
  </head>
  <body>
    <div class="page">
      <div class="header">
        <h1 class="title">${escapeHtml(data.title)}</h1>
        <div class="meta">班级：${escapeHtml(data.className)}，导出时间：${escapeHtml(data.exportedAt)}，完成人数：${data.count}</div>
        <div class="stats">
          ${[
            ['平均分', data.average],
            ['最高分', data.max],
            ['最低分', data.min],
            ['及格人数', data.passCount],
            ['优秀人数', data.excellentCount],
            ['完成人数', data.count],
          ].map(([label, value]) => `
            <div class="stat">
              <div class="stat-label">${escapeHtml(label)}</div>
              <div class="stat-value">${escapeHtml(value)}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <section class="section">
        <h2 class="section-title">成绩明细</h2>
        <table>
          <thead>
            <tr>
              <th style="width:42px;">排名</th>
              <th style="width:92px;">姓名</th>
              <th style="width:74px;">分数</th>
              <th style="width:90px;">档位</th>
              <th>摘要</th>
              <th>主要问题</th>
              <th>修改建议</th>
            </tr>
          </thead>
          <tbody>
            ${data.rows.map((row) => `
              <tr>
                <td>${row.rank}</td>
                <td>${escapeHtml(row.studentName)}</td>
                <td>${escapeHtml(`${row.score}/${row.maxScore}`)}</td>
                <td>${escapeHtml(row.tier || '--')}</td>
                <td>${escapeHtml(row.summary || '--')}</td>
                <td>${escapeHtml(row.issues || '--')}</td>
                <td>${escapeHtml(row.suggestions || '--')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </section>

      <section class="section">
        <h2 class="section-title">高频问题</h2>
        <ol class="issue-list">
          ${(data.topIssues.length ? data.topIssues : [{ issue: '当前暂无足够数据统计高频问题', count: 0 }]).map((item) => `
            <li>${escapeHtml(item.issue)}${item.count ? `（${item.count}次）` : ''}</li>
          `).join('')}
        </ol>
      </section>
    </div>
    <script>setTimeout(() => window.print(), 300);</script>
  </body>
  </html>`;
}

function triggerHtmlPrint(html, title) {
  const safeTitle = String(title || '班级汇总报告').replace(/[\\/:*?"<>|]+/g, '_').trim() || '班级汇总报告';
  const frame = document.createElement('iframe');
  frame.title = safeTitle;
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '1px';
  frame.style.height = '1px';
  frame.style.border = '0';
  frame.style.opacity = '0';
  document.body.appendChild(frame);

  const frameWindow = frame.contentWindow;
  const frameDocument = frame.contentDocument || frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    frame.remove();
    return { mode: 'unsupported' };
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();
  window.setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
    window.setTimeout(() => frame.remove(), 60_000);
  }, 350);
  return { mode: 'iframe' };
}

export function exportBatchSummaryReportPdf({ items = [], title = '', className = '' }) {
  const html = buildBatchSummaryReportHtml({ items, title, className });
  return triggerHtmlPrint(html, title || '班级汇总报告');
}

export async function exportBatchSummaryWorkbook({ items = [], title = '', className = '' }) {
  const ExcelJS = (await import('exceljs')).default;
  const data = buildBatchSummaryExportData({ items, title, className });
  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet('汇总');
  summarySheet.columns = [{ width: 24 }, { width: 72 }];
  const summaryRows = [
    ['班级汇总报告'],
    ['班级', data.className],
    ['导出时间', data.exportedAt],
    ['完成人数', data.count],
    ['平均分', data.average],
    ['最高分', data.max],
    ['最低分', data.min],
    ['及格人数', data.passCount],
    ['优秀人数', data.excellentCount],
    [],
    ['高频问题', '出现次数'],
    ...data.topIssues.map((item) => [item.issue, item.count]),
  ];
  summaryRows.forEach((row) => summarySheet.addRow(row));

  const detailSheet = workbook.addWorksheet('成绩明细');
  detailSheet.columns = [
    { header: '排名', width: 8 },
    { header: '姓名', width: 12 },
    { header: '分数', width: 8 },
    { header: '满分', width: 8 },
    { header: '得分率', width: 10 },
    { header: '档位', width: 18 },
    { header: '摘要', width: 42 },
    { header: '主要问题', width: 52 },
    { header: '修改建议', width: 52 },
  ];
  data.rows.forEach((row) => {
    detailSheet.addRow([
      row.rank, row.studentName, row.score, row.maxScore,
      row.ratio, row.tier, row.summary, row.issues, row.suggestions,
    ]);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const safeTitle = String(title || '班级汇总报告').replace(/[\\/:*?"<>|]+/g, '_').trim() || '班级汇总报告';
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeTitle}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { mode: 'xlsx' };
}

export function exportBatchSummaryCsv({ items = [], title = '', className = '' }) {
  const data = buildBatchSummaryExportData({ items, title, className });
  const rows = [
    ['班级', data.className],
    ['导出时间', data.exportedAt],
    ['完成人数', data.count],
    ['平均分', data.average],
    ['最高分', data.max],
    ['最低分', data.min],
    [],
    ['排名', '姓名', '分数', '满分', '档位', '摘要', '主要问题', '修改建议'],
    ...data.rows.map((row) => [
      row.rank,
      row.studentName,
      row.score,
      row.maxScore,
      row.tier,
      row.summary,
      row.issues,
      row.suggestions,
    ]),
  ];

  const csvText = `\uFEFF${rows.map((row) => row.map((cell) => {
    const text = String(cell ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(',')).join('\n')}`;
  const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeTitle = String(title || '班级汇总报告').replace(/[\\/:*?"<>|]+/g, '_').trim() || '班级汇总报告';
  link.href = url;
  link.download = `${safeTitle}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { mode: 'csv' };
}
