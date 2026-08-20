import { useState } from 'react';

import { T, pct, gradeColor } from './constants.js';
import useAnalyticsPanelModel from './useAnalyticsPanelModel.jsx';
import AppIcon from '../../components/shared/AppIcon.jsx';
import { SurfaceCard, SurfaceHeader } from '../../components/shared/UI.jsx';
import { SURFACE_SPACING } from '../../constants/index.jsx';

function EmptyBar({ label }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ width: '100%', height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
        <div style={{ width: '60%', height: 8, background: '#e8e0d5', borderRadius: '3px 3px 0 0', border: '1.5px dashed #d8cfc4' }} />
      </div>
      <div style={{ fontSize: 10, color: T.textMuted, textAlign: 'center' }}>{label}</div>
    </div>
  );
}

function StatCard({ label, value, unit, color, empty }) {
  return (
    <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 12, background: T.cardAlt, border: `1px ${empty ? 'dashed' : 'solid'} ${T.border}` }}>
      {empty ? (
        <div style={{ fontSize: 20, color: T.border, fontWeight: 800, marginBottom: 2 }}>—</div>
      ) : (
        <div style={{ fontSize: 22, fontWeight: 800, color, marginBottom: 2 }}>
          {value}
          <span style={{ fontSize: 12, fontWeight: 400 }}>{unit}</span>
        </div>
      )}
      <div style={{ fontSize: 11, color: T.textMuted }}>{label}</div>
    </div>
  );
}

function BarRow({ label, labelColor, value, total, barColor, empty }) {
  const width = !empty && total > 0 ? `${Math.round((value / total) * 100)}%` : '0%';
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
        <span style={{ color: labelColor || T.primaryDark, fontWeight: 600 }}>{label}</span>
        <span style={{ color: T.textMuted }}>{empty ? '—' : `${value} 篇`}</span>
      </div>
      <div style={{ height: 6, background: '#e8e0d5', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width, background: empty ? '#e8e0d5' : barColor, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
    </div>
  );
}

function SwotCell({ icon, label, color, bg, items, empty }) {
  return (
    <div style={{ background: empty ? T.cardAlt : bg, borderRadius: 10, padding: '12px 14px', border: `1px ${empty ? 'dashed' : 'solid'} ${empty ? T.border : `${color}40`}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: empty ? T.textMuted : color, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
        <span>{icon}</span> {label}
      </div>
      {empty ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[80, 60, 90].map((w, i) => (
            <div key={i} style={{ height: 8, width: `${w}%`, background: '#e8e0d5', borderRadius: 4 }} />
          ))}
          <div style={{ fontSize: 10, color: T.textMuted, marginTop: 4 }}>完成更多写作后自动生成</div>
        </div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((item, i) => (
            <li key={i} style={{ fontSize: 11, color: T.text, lineHeight: 1.5 }}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SuggestionCard({ icon, title, content, empty }) {
  return (
    <div style={{ background: T.cardAlt, borderRadius: 10, padding: '12px 14px', border: `1px ${empty ? 'dashed' : 'solid'} ${T.border}`, display: 'flex', gap: 12 }}>
      <div style={{ fontSize: 22, flexShrink: 0, opacity: empty ? 0.3 : 1 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: empty ? T.textMuted : T.primaryDark, marginBottom: 4 }}>{title}</div>
        {empty ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[100, 85, 70].map((w, i) => (
              <div key={i} style={{ height: 7, width: `${w}%`, background: '#e8e0d5', borderRadius: 4 }} />
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.7 }}>{content}</div>
        )}
      </div>
    </div>
  );
}

export default function AnalyticsPanel({ writings, isMobile }) {
  const [open, setOpen] = useState(true);
  const isEmpty = writings.length === 0;
  const { avgScore, dimAnalysis, graded, maxWeek, scoreDist, suggestions, swot, weeklyData } = useAnalyticsPanelModel({ writings, isMobile });

  const swotConfig = [
    { key: 'strengths', icon: <AppIcon name="dumbbell" size={14} />, label: '优势', color: T.success, bg: T.successLight },
    { key: 'weaknesses', icon: <AppIcon name="alert" size={14} />, label: '劣势', color: T.error, bg: T.errorLight },
    { key: 'opportunities', icon: <AppIcon name="trending-up" size={14} />, label: '机会', color: '#2563eb', bg: '#eff6ff' },
    { key: 'threats', icon: <AppIcon name="target" size={14} />, label: '威胁', color: '#d97706', bg: '#fef3c7' },
  ];

  const distColors = { '90-100': T.success, '75-89': T.primary, '60-74': '#d97706', '<60': T.error };
  const cols = isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';
  const toggleIndicator = (
    <span
      aria-hidden="true"
      style={{
        color: T.textMuted,
        fontSize: 11,
        fontWeight: 700,
      }}
    >
      {open ? '▲' : '▼'}
    </span>
  );

  return (
    <SurfaceCard style={{ overflow: 'hidden', marginBottom: SURFACE_SPACING.stack }}>
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? '收起写作数据分析' : '展开写作数据分析'}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          padding: 0,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <SurfaceHeader
          icon={<AppIcon name="chart" size={16} />}
          title="写作数据分析"
          badge={isEmpty ? '暂无数据' : `${writings.length} 篇`}
          action={toggleIndicator}
          isMobile={isMobile}
        />
      </button>

      {open && (
        <div style={{ padding: `0 ${isMobile ? 12 : 20}px ${isMobile ? 14 : 20}px`, borderTop: `1px solid ${T.border}`, marginTop: 14 }}>
          {isEmpty && (
            <div style={{ marginTop: 12, marginBottom: 14, padding: '10px 14px', background: T.primaryLight, borderRadius: 10, border: '1px solid #f0cc80', fontSize: 12, color: T.primaryDark, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AppIcon name="lightbulb" size={16} />完成第一篇写作批改后，所有图表将自动填充
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: cols, gap: 10, marginTop: isEmpty ? 0 : 14, marginBottom: 14 }}>
            <StatCard label="总篇数" value={writings.length} unit="篇" color={T.primary} empty={isEmpty} />
            <StatCard label="已批改" value={graded.length} unit="篇" color={T.success} empty={isEmpty} />
            <StatCard label="平均分" value={avgScore} unit="%" color={gradeColor(avgScore)} empty={isEmpty} />
            <StatCard label="最高分" value={graded.length ? Math.max(...graded.map((w) => pct(w.feedback.totalScore, w.maxScore || 15))) : 0} unit="%" color="#2563eb" empty={isEmpty} />
          </div>

          <div style={{ background: T.cardAlt, borderRadius: 12, padding: '12px 14px', marginBottom: 12, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.primaryDark, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}><AppIcon name="clock" size={14} />近期提交频率</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end' }}>
              {weeklyData.map((w, i) =>
                isEmpty ? (
                  <EmptyBar key={i} label={w.label} />
                ) : (
                  <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    {w.count > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: T.primary }}>{w.count}</div>}
                    <div style={{ width: '100%', height: 60, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{ width: '60%', height: Math.max(4, Math.round((w.count / maxWeek) * 56)), background: w.count > 0 ? T.primary : '#e8e0d5', borderRadius: '3px 3px 0 0', transition: 'height 0.5s ease' }} />
                    </div>
                    <div style={{ fontSize: 9, color: T.textMuted }}>{w.label}</div>
                  </div>
                )
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div style={{ background: T.cardAlt, borderRadius: 12, padding: '12px 14px', border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.primaryDark, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><AppIcon name="pie-chart" size={14} />分数分布</div>
              {Object.entries(scoreDist).map(([range, count]) => (
                <BarRow key={range} label={`${range}%`} labelColor={distColors[range]} value={count} total={graded.length} barColor={distColors[range]} empty={isEmpty} />
              ))}
            </div>
            <div style={{ background: T.cardAlt, borderRadius: 12, padding: '12px 14px', border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.primaryDark, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><AppIcon name="layers" size={14} />四维度表现</div>
              {dimAnalysis.map((dim, i) => {
                const color = dim.avg >= 3.5 ? T.success : dim.avg >= 2.5 ? T.primary : dim.avg >= 1.5 ? '#d97706' : T.error;
                return (
                  <div key={i} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ color: T.text, fontWeight: 600 }}>{dim.name}</span>
                      <span style={{ color: isEmpty ? T.textMuted : color, fontWeight: 700 }}>{isEmpty ? '—' : dim.label}</span>
                    </div>
                    <div style={{ height: 6, background: '#e8e0d5', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: isEmpty ? '0%' : `${(dim.avg / 4) * 100}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.primaryDark, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><AppIcon name="radar" size={14} />SWOT 分析</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {swotConfig.map((cfg) => (
                <SwotCell key={cfg.key} icon={cfg.icon} label={cfg.label} color={cfg.color} bg={cfg.bg} items={swot[cfg.key]} empty={isEmpty} />
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.primaryDark, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><AppIcon name="lightbulb" size={14} />个性化建议</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {suggestions.map((item, i) => (
                <SuggestionCard key={i} icon={item.icon} title={item.title} content={item.content} empty={isEmpty} />
              ))}
            </div>
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}
