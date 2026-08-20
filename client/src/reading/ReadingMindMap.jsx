import { useState, useRef, useCallback, useEffect } from "react";

const GENRE_COLORS = {
  说明文: { bg: '#e8f4f1', text: '#1a7a6e', border: 'rgba(26,122,110,0.25)' },
  议论文: { bg: '#eef0fb', text: '#3a4ac4', border: 'rgba(58,74,196,0.25)' },
  记叙文: { bg: '#fdf3e8', text: '#b86a1a', border: 'rgba(184,106,26,0.25)' },
  新闻报道: { bg: '#f0f4ff', text: '#2a5aab', border: 'rgba(42,90,171,0.25)' },
};

const BRANCH_PALETTE = [
  '#1a7a6e', '#239a8a', '#2dbbaa', '#0f5a52',
  '#1a6e7a', '#3a8a78', '#156655', '#28a090',
];

function GenreBadge({ genre }) {
  const c = GENRE_COLORS[genre] || GENRE_COLORS['说明文'];
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.text,
      border: `1px solid ${c.border}`, letterSpacing: 0.5,
    }}>
      {genre}
    </span>
  );
}

function CenterNode({ center, mainIdea, genre }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      padding: '16px 20px', borderRadius: 20,
      background: 'linear-gradient(135deg, #1a7a6e 0%, #115a51 100%)',
      color: '#fff', boxShadow: '0 8px 28px rgba(26,122,110,0.3)',
      textAlign: 'center', width: 'fit-content', maxWidth: 240, flexShrink: 0,
    }}>
      <GenreBadge genre={genre} />
      <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.3 }}>{center}</div>
      <div style={{ fontSize: 11, opacity: 0.82, lineHeight: 1.6 }}>{mainIdea}</div>
    </div>
  );
}

function BranchNode({ branch, color, side, expanded, onToggle, wasDragged }) {
  const hasDetails = Array.isArray(branch.details) && branch.details.length > 0;
  return (
    <button
      type="button"
      disabled={!hasDetails}
      style={{
        display: 'flex', flexDirection: 'column',
        padding: '10px 14px', borderRadius: 14,
        background: '#fff', border: `1.5px solid ${color}35`,
        boxShadow: `0 4px 14px ${color}15`,
        width: 'fit-content', maxWidth: 240,
        textAlign: side === 'right' ? 'left' : 'right',
        cursor: hasDetails ? 'pointer' : 'default',
        userSelect: 'none',
        transition: 'box-shadow 0.15s',
        font: 'inherit',
      }}
      onClick={() => {
        if (wasDragged()) return;
        if (hasDetails) onToggle();
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5,
        justifyContent: side === 'right' ? 'flex-start' : 'flex-end',
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color,
          background: `${color}15`, padding: '2px 8px', borderRadius: 8,
        }}>
          {branch.label}
        </span>
        {hasDetails && (
          <span style={{ fontSize: 8, color, opacity: 0.75 }}>
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </div>

      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f2e2a', lineHeight: 1.35, marginBottom: 6 }}>
        {branch.topic}
      </div>

      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 4,
        justifyContent: side === 'right' ? 'flex-start' : 'flex-end',
      }}>
        {(branch.keywords || []).map((kw) => (
          <span key={kw} style={{
            fontSize: 10, color,
            background: `${color}12`, padding: '1px 7px',
            borderRadius: 6, border: `1px solid ${color}22`,
          }}>
            {kw}
          </span>
        ))}
      </div>

      {expanded && hasDetails && (
        <div style={{
          marginTop: 8, paddingTop: 8,
          borderTop: `1px solid ${color}22`,
          display: 'flex', flexDirection: 'column', gap: 3,
        }}>
          {branch.details.map((d) => (
            <div key={d} style={{
              display: 'flex', gap: 5, alignItems: 'flex-start',
              flexDirection: side === 'right' ? 'row' : 'row-reverse',
              justifyContent: side === 'right' ? 'flex-start' : 'flex-end',
            }}>
              <span style={{ color, fontSize: 9, marginTop: 3, flexShrink: 0 }}>●</span>
              <span style={{ fontSize: 11, color: '#4a7a74', lineHeight: 1.55 }}>{d}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  );
}

function Connector({ color, side }) {
  return (
    <div style={{
      width: 36, height: 2, flexShrink: 0, alignSelf: 'center',
      background: side === 'right'
        ? `linear-gradient(90deg, ${color}55, ${color}18)`
        : `linear-gradient(270deg, ${color}55, ${color}18)`,
    }} />
  );
}

export default function ReadingMindMap({ data }) {
  const { genre = '说明文', mainIdea = '', mindMap = {} } = data;
  const branches = mindMap.branches || [];
  const center = mindMap.center || '核心主题';

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastPosRef = useRef(null);
  const dragDistRef = useRef(0);
  const containerRef = useRef(null);
  const [expanded, setExpanded] = useState({});

  const toggleExpand = useCallback((id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const wasDragged = useCallback(() => dragDistRef.current > 5, []);

  const left = branches.filter((_, i) => i % 2 === 1);
  const right = branches.filter((_, i) => i % 2 === 0);

  // Non-passive wheel listener for zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      setScale(s => Math.max(0.3, Math.min(2.5, +(s * factor).toFixed(3))));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    dragDistRef.current = 0;
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!isDragging || !lastPosRef.current) return;
    const dx = e.clientX - lastPosRef.current.x;
    const dy = e.clientY - lastPosRef.current.y;
    dragDistRef.current += Math.abs(dx) + Math.abs(dy);
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const resetView = () => { setScale(1); setPan({ x: 0, y: 0 }); };

  return (
    <section className="rd-mindmap">
      <div className="rd-mindmap__header">
        <span className="rd-mindmap__title">文章思维导图</span>
        <div className="rd-mindmap__controls">
          <button type="button" onClick={() => setScale(s => Math.min(2.5, +(s * 1.2).toFixed(3)))}>+</button>
          <span>{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale(s => Math.max(0.3, +(s / 1.2).toFixed(3)))}>-</button>
          <button type="button" className="rd-mindmap__reset" onClick={resetView}>重置</button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="rd-mindmap__canvas"
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Inner positioned canvas */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          display: 'flex', alignItems: 'center',
          pointerEvents: 'auto',
        }}>
          {/* Left branches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-end' }}>
            {left.map((branch, i) => {
              const color = BRANCH_PALETTE[i * 2 + 1] || '#1a7a6e';
              return (
                <div key={branch.id} style={{ display: 'flex', alignItems: 'center', flexDirection: 'row-reverse' }}>
                  <BranchNode
                    branch={branch} color={color} side="left"
                    expanded={!!expanded[branch.id]}
                    onToggle={() => toggleExpand(branch.id)}
                    wasDragged={wasDragged}
                  />
                  <Connector color={color} side="left" />
                </div>
              );
            })}
            {left.length === 0 && <div style={{ width: 160 }} />}
          </div>

          {/* Center */}
          <div style={{ padding: '0 8px', flexShrink: 0 }}>
            <CenterNode center={center} mainIdea={mainIdea} genre={genre} />
          </div>

          {/* Right branches */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start' }}>
            {right.map((branch, i) => {
              const color = BRANCH_PALETTE[i * 2] || '#1a7a6e';
              return (
                <div key={branch.id} style={{ display: 'flex', alignItems: 'center' }}>
                  <Connector color={color} side="right" />
                  <BranchNode
                    branch={branch} color={color} side="right"
                    expanded={!!expanded[branch.id]}
                    onToggle={() => toggleExpand(branch.id)}
                    wasDragged={wasDragged}
                  />
                </div>
              );
            })}
          </div>
        </div>

      </div>

      <p className="rd-mindmap__hint">滚轮缩放 · 拖拽移动 · 点击节点跳转知识点 · 点击 +/− 展开收起</p>
    </section>
  );
}
