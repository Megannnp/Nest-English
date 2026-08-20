import { useEffect, useMemo, useState } from 'react';

import {
  SINGLE_FEEDBACK_REGRESSION_SAMPLES,
  getSingleFeedbackRegressionSampleByType,
} from '../../../shared/regression/singleFeedbackSamples.js';
import {
  getSingleFeedbackSnapshotBySampleId,
} from '../../../shared/regression/singleFeedbackSnapshots.js';
import { aiAPI } from '../api/index.js';
import { THEME } from '../styles/theme.js';
import {
  buildFeedbackFromAIResponse,
} from '../writing/core/writingFeedback.js';
import { buildPrompt } from '../writing/core/writingPrompts.js';

function codeBlockStyle(height = 260) {
  return {
    margin: 0,
    whiteSpace: 'pre-wrap',
    fontFamily: THEME.typography.mono,
    fontSize: 12,
    lineHeight: 1.7,
    color: THEME.color.text,
    background: '#fffdfa',
    border: `1px solid ${THEME.color.border}`,
    borderRadius: 16,
    padding: 16,
    minHeight: height,
    overflow: 'auto',
  };
}

function surface(style = {}) {
  return {
    background: THEME.color.bgElevated,
    border: `1px solid ${THEME.color.border}`,
    borderRadius: 24,
    boxShadow: THEME.shadow.soft,
    ...style,
  };
}

function buildUserText(sample) {
  const header = `【作业信息】\n写作标题：${sample.title}\n写作类型：${sample.type}\n题目要求：\n${sample.promptText}\n\n【学生作文】\n`;
  return header + sample.studentText;
}

function getFieldValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function stringify(value) {
  return JSON.stringify(value, null, 2);
}

function _buildSampleEssayCheck(currentFeedback) {
  const text = currentFeedback?.sampleEssay?.text || '';
  return {
    label: '范文完整返回',
    passed: String(text).trim().length >= 120,
    detail: text
      ? `范文长度：${String(text).trim().length} 字符`
      : '当前输出缺少完整范文',
  };
}

function buildChecklist(sample, currentFeedback, snapshot) {
  const checklist = [];
  const currentCategories = Array.isArray(currentFeedback?.categories)
    ? currentFeedback.categories.map((item) => item?.name)
    : [];

  checklist.push({
    label: '四维评分完整',
    passed: ['内容', '语言', '结构', '书写'].every((name) => currentCategories.includes(name)),
    detail: currentCategories.length ? `当前维度：${currentCategories.join(' / ')}` : '当前还没有解析出四维。',
  });

  checklist.push({
    label: '总评具备辨识度',
    passed: String(currentFeedback?.summary || '').trim().length >= 20,
    detail: currentFeedback?.summary || '暂无总评',
  });

  checklist.push(_buildSampleEssayCheck(currentFeedback));

  sample.expectations.requiredFeedbackFields.forEach((field) => {
    checklist.push({
      label: `包含字段 ${field}`,
      passed: getFieldValue(currentFeedback, field) != null,
      detail: getFieldValue(currentFeedback, field) != null
        ? '已返回'
        : `理想快照中该字段为：${stringify(getFieldValue(snapshot, field))}`,
    });
  });

  checklist.push({
    label: '总分未超出满分',
    passed: Number(currentFeedback?.totalScore ?? 0) <= Number(sample.maxScore),
    detail: `${currentFeedback?.totalScore ?? '—'} / ${sample.maxScore}`,
  });

  return checklist;
}

function SectionTitle({ eyebrow, title, subtitle, actions }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      <div>
        {eyebrow ? (
          <div style={{ fontSize: 12, letterSpacing: '0.08em', fontWeight: 800, color: THEME.color.primaryStrong, marginBottom: 6 }}>
            {eyebrow}
          </div>
        ) : null}
        <div style={{ fontSize: 26, fontWeight: 900, color: THEME.color.text, lineHeight: 1.1 }}>{title}</div>
        {subtitle ? (
          <div style={{ marginTop: 8, fontSize: 14, color: THEME.color.textSecondary, lineHeight: 1.7 }}>{subtitle}</div>
        ) : null}
      </div>
      {actions}
    </div>
  );
}

function ActionButton({ children, onClick, disabled = false, tone = 'default' }) {
  const toneMap = {
    default: {
      background: '#fffdf8',
      color: THEME.color.text,
      border: `1px solid ${THEME.color.border}`,
    },
    primary: {
      background: THEME.color.primary,
      color: '#fff',
      border: `1px solid ${THEME.color.primary}`,
    },
  };

  return (
    <button
      type="button"
      aria-label={typeof children === 'string' ? children : undefined}
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '10px 14px',
        borderRadius: 14,
        fontSize: 13,
        fontWeight: 800,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.56 : 1,
        ...toneMap[tone],
      }}
    >
      {children}
    </button>
  );
}

function JsonPanel({ title, subtitle, value, height = 300 }) {
  return (
    <div style={surface({ padding: 18, display: 'grid', gap: 12 })}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: THEME.color.primaryStrong, letterSpacing: '0.08em', marginBottom: 6 }}>{title}</div>
        {subtitle ? <div style={{ fontSize: 13, color: THEME.color.textSecondary, lineHeight: 1.6 }}>{subtitle}</div> : null}
      </div>
      <pre style={codeBlockStyle(height)}>{value}</pre>
    </div>
  );
}

export default function SingleFeedbackRegressionLab({ user }) {
  const [activeType, setActiveType] = useState(SINGLE_FEEDBACK_REGRESSION_SAMPLES[0]?.type || 'letter');
  const [rawOutput, setRawOutput] = useState('');
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [currentSource, setCurrentSource] = useState('snapshot');
  const [error, setError] = useState('');
  const [running, setRunning] = useState(false);

  const sample = useMemo(
    () => getSingleFeedbackRegressionSampleByType(activeType) || SINGLE_FEEDBACK_REGRESSION_SAMPLES[0],
    [activeType]
  );
  const snapshot = useMemo(
    () => getSingleFeedbackSnapshotBySampleId(sample?.id),
    [sample]
  );
  const prompt = useMemo(
    () => buildPrompt(sample.maxScore, sample.type, { submissionMode: sample.submissionMode }),
    [sample]
  );
  const userText = useMemo(() => buildUserText(sample), [sample]);
  const checklist = useMemo(
    () => buildChecklist(sample, currentFeedback || snapshot, snapshot),
    [sample, currentFeedback, snapshot]
  );

  useEffect(() => {
    if (!snapshot) return;
    setRawOutput(stringify(snapshot));
    setCurrentFeedback(snapshot);
    setCurrentSource('snapshot');
    setError('');
  }, [snapshot]);

  const handleParseRaw = async() => {
    setError('');
    try {
      const feedback = await buildFeedbackFromAIResponse({
        rawText: rawOutput,
        originalText: sample.studentText,
        type: sample.type,
        aiAnalysis: { type: sample.type, themes: [] },
        maxScore: sample.maxScore,
      });
      setCurrentFeedback(feedback);
      setCurrentSource('pasted');
    } catch (err) {
      setError(err.message || '当前输出解析失败');
    }
  };

  const handleLoadSnapshot = () => {
    setRawOutput(stringify(snapshot));
    setCurrentFeedback(snapshot);
    setCurrentSource('snapshot');
    setError('');
  };

  const handleRunPrompt = async() => {
    setRunning(true);
    setError('');
    try {
      const result = await aiAPI.complete({
        model: undefined,
        max_tokens: 12288,
        temperature: 0.1,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userText },
        ],
      });

      const content = result?.content || '';
      setRawOutput(content);
      const feedback = await buildFeedbackFromAIResponse({
        rawText: content,
        originalText: sample.studentText,
        type: sample.type,
        aiAnalysis: { type: sample.type, themes: [] },
        maxScore: sample.maxScore,
      });
      setCurrentFeedback(feedback);
      setCurrentSource('live');
    } catch (err) {
      setError(err.message || '试跑失败');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #f7f2e9 0%, #fbf8f3 100%)',
        padding: 24,
        fontFamily: THEME.typography.sans,
        color: THEME.color.text,
      }}
    >
      <div style={{ maxWidth: 1600, margin: '0 auto', display: 'grid', gap: 18 }}>
        <div style={surface({
          padding: 24,
          background: 'radial-gradient(circle at top left, rgba(245, 211, 171, 0.28), transparent 26%), #fffdf8',
        })}>
          <SectionTitle
            eyebrow="SINGLE FEEDBACK REGRESSION LAB"
            title="单篇批改质量实验台"
            subtitle="同页对比样例作文、当前 prompt、当前输出和理想快照。后续调质量时，先看这页就能知道是 prompt 退化了，还是展示链路出了问题。"
            actions={
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <ActionButton onClick={handleLoadSnapshot}>加载理想快照</ActionButton>
                <ActionButton onClick={handleParseRaw}>解析当前输出</ActionButton>
                <ActionButton onClick={handleRunPrompt} tone="primary" disabled={running || !user}>
                  {running ? '试跑中…' : (user ? '用当前 Prompt 试跑' : '登录后可试跑')}
                </ActionButton>
              </div>
            }
          />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
            {SINGLE_FEEDBACK_REGRESSION_SAMPLES.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveType(item.type)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: `1px solid ${item.type === activeType ? THEME.color.primary : THEME.color.border}`,
                  background: item.type === activeType ? THEME.color.primarySoft : '#fffdf8',
                  color: item.type === activeType ? THEME.color.primaryStrong : THEME.color.textSecondary,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {item.type}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 13, color: THEME.color.textSecondary, lineHeight: 1.8 }}>
            当前样例：{sample.title} | 题型：{sample.type} | 满分：{sample.maxScore} | 提交方式：{sample.submissionMode}
            {' '}| 当前输出来源：{currentSource === 'live' ? '实时试跑' : currentSource === 'pasted' ? '粘贴解析' : '理想快照'}
          </div>
          {error ? (
            <div style={{
              marginTop: 14,
              padding: '12px 14px',
              borderRadius: 14,
              background: THEME.color.errorSoft,
              border: `1px solid ${THEME.color.error}33`,
              color: THEME.color.error,
              fontSize: 13,
              lineHeight: 1.7,
            }}>
              {error}
            </div>
          ) : null}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr 1fr', gap: 18, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 18 }}>
            <JsonPanel
              title="样例作文"
              subtitle={`${sample.expectations.focus}。题目要求与学生作文放在一起，方便快速判断这次反馈有没有说到点上。`}
              value={`【题目要求】\n${sample.promptText}\n\n【学生作文】\n${sample.studentText}`}
              height={430}
            />
            <div style={surface({ padding: 18, display: 'grid', gap: 12 })}>
              <div style={{ fontSize: 12, fontWeight: 800, color: THEME.color.primaryStrong, letterSpacing: '0.08em' }}>自动检查清单</div>
              <div style={{ display: 'grid', gap: 10 }}>
                {checklist.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 16,
                      background: item.passed ? THEME.color.successSoft : THEME.color.warningSoft,
                      border: `1px solid ${item.passed ? `${THEME.color.success}33` : `${THEME.color.warning}33`}`,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: item.passed ? THEME.color.success : THEME.color.warning }}>
                      {item.passed ? '通过' : '关注'} · {item.label}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, color: THEME.color.textSecondary, lineHeight: 1.7 }}>
                      {item.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 18 }}>
            <JsonPanel
              title="当前 Prompt"
              subtitle="这里展示真正会送给模型的系统提示词。你每次改 prompt，先在这里看它是不是把任务说清了。"
              value={prompt}
              height={720}
            />
            <div style={surface({ padding: 18, display: 'grid', gap: 12 })}>
              <div style={{ fontSize: 12, fontWeight: 800, color: THEME.color.primaryStrong, letterSpacing: '0.08em' }}>发送给模型的用户消息</div>
              <pre style={codeBlockStyle(200)}>{userText}</pre>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 18 }}>
            <div style={surface({ padding: 18, display: 'grid', gap: 12 })}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: THEME.color.primaryStrong, letterSpacing: '0.08em', marginBottom: 6 }}>当前输出</div>
                <div style={{ fontSize: 13, color: THEME.color.textSecondary, lineHeight: 1.7 }}>
                  可以直接粘贴模型原始返回，再点“解析当前输出”；也可以用“试跑”按钮直接拿当前 prompt 跑一遍。
                </div>
              </div>
              <textarea
                aria-label="当前输出"
                value={rawOutput}
                onChange={(e) => setRawOutput(e.target.value)}
                spellCheck={false}
                style={{
                  minHeight: 280,
                  resize: 'vertical',
                  borderRadius: 16,
                  border: `1px solid ${THEME.color.border}`,
                  padding: 16,
                  fontSize: 12,
                  lineHeight: 1.7,
                  fontFamily: THEME.typography.mono,
                  background: '#fffdfa',
                  color: THEME.color.text,
                }}
              />
              <pre style={codeBlockStyle(260)}>{stringify(currentFeedback || {})}</pre>
            </div>

            <JsonPanel
              title="理想快照"
              subtitle="这是当前题型的质量基准。真正跑出来的结果不需要逐字一样，但至少应该在任务完成度、四维评价和专属字段上达到同级别。"
              value={stringify(snapshot || {})}
              height={560}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
