import { useRef, useEffect, useState, useCallback } from "react";

// ── 视觉常量 ──────────────────────────────────────────────────────────────────
const PAL = {
  "c-purple": { f: "#EEEDFE", s: "#534AB7", t: "#3C3489", ts: "#534AB7" },
  "c-teal":   { f: "#E1F5EE", s: "#0F6E56", t: "#085041", ts: "#0F6E56" },
  "c-coral":  { f: "#FAECE7", s: "#993C1D", t: "#712B13", ts: "#993C1D" },
  "c-gray":   { f: "#F1EFE8", s: "#5F5E5A", t: "#444441", ts: "#5F5E5A" },
  "c-amber":  { f: "#FAEEDA", s: "#854F0B", t: "#633806", ts: "#854F0B" },
};

const NODE_MIN_W = 104;
const NODE_MAX_W = 220;
const NODE_H    = 58;    // 固定卡片高度
const ROW_GAP   = 64;
const COL_GAP   = 20;
const TOG_R     = 9;
const ROLE_SZ   = 10;
const WORD_SZ   = 13;
const RX        = 10;
const EDGE_COLOR = "#C8C5BC";
const MIN_SCALE  = 0.15;
const MAX_SCALE  = 4;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function approxTextW(text) {
  return Array.from(text || "").reduce((sum, ch) => sum + (ch.charCodeAt(0) <= 0x7f ? 7 : 13), 0);
}

function getNodeW(node) {
  return clamp(Math.max(approxTextW(node?.role), approxTextW(node?.word)) + 28, NODE_MIN_W, NODE_MAX_W);
}

// ── 纯计算函数（不需要 canvas context）─────────────────────────────────────
function buildNodeMap(node, map = {}) {
  map[node.id] = node;
  (node.children || []).forEach(c => buildNodeMap(c, map));
  return map;
}

function subtreeW(id, nm, ex) {
  const n = nm[id];
  if (!n) return NODE_MIN_W;
  const ownW = getNodeW(n);
  if (!ex.has(id) || !(n.children || []).length) return ownW;
  const cw = n.children.reduce(
    (s, c, i) => s + subtreeW(c.id, nm, ex) + (i ? COL_GAP : 0), 0
  );
  return Math.max(ownW, cw);
}

function doLayout(id, x, y, pos, nm, ex) {
  const s = subtreeW(id, nm, ex);
  const w = getNodeW(nm[id]);
  pos[id] = { x: x + (s - w) / 2, y, w, h: NODE_H };
  if (ex.has(id) && (nm[id]?.children || []).length) {
    let cx = x;
    nm[id].children.forEach(c => {
      doLayout(c.id, cx, y + NODE_H + ROW_GAP, pos, nm, ex);
      cx += subtreeW(c.id, nm, ex) + COL_GAP;
    });
  }
}

function calcTreeH(id, pos, nm, ex) {
  const p = pos[id];
  if (!p) return 0;
  let max = p.y + p.h + TOG_R * 2 + 4;
  if (ex.has(id)) {
    (nm[id]?.children || []).forEach(c => {
      max = Math.max(max, calcTreeH(c.id, pos, nm, ex));
    });
  }
  return max;
}

function truncText(ctx, text, maxW) {
  if (!text) return "";
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

function getDPR() {
  return typeof window !== "undefined" ? (window.devicePixelRatio || 1) : 1;
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function SentenceTree({ treeData }) {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const posRef       = useRef({});

  // 用 ref 存储高频变化的状态，避免不必要的 React 重渲染
  const transformRef  = useRef({ tx: 20, ty: 20, scale: 1 });
  const nodeMapRef    = useRef({});
  const expandedRef   = useRef(new Set());
  const activeIdRef   = useRef(null);

  // React state 只用于 UI 驱动（卡片详情、图例等）
  const [nodeMap,  setNodeMap]  = useState({});
  const [expanded, setExpanded] = useState(new Set());
  const [activeId, setActiveId] = useState(null);
  const [scaleLabel, setScaleLabel] = useState(100);
  const rootId = treeData?.id;

  // 保持 ref 与 state 同步
  useEffect(() => { nodeMapRef.current  = nodeMap;  }, [nodeMap]);
  useEffect(() => { expandedRef.current = expanded; }, [expanded]);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  // ── 核心绘制函数 ──────────────────────────────────────────────────────────
  const renderTree = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs || !treeData) return;
    const nm = nodeMapRef.current;
    if (!Object.keys(nm).length) return;
    const ex     = expandedRef.current;
    const active = activeIdRef.current;
    const dpr    = getDPR();
    const { tx, ty, scale } = transformRef.current;
    const W = cvs.clientWidth;
    const H = cvs.clientHeight;

    // 仅在尺寸变化时重设 canvas 分辨率
    if (cvs.width !== Math.round(W * dpr) || cvs.height !== Math.round(H * dpr)) {
      cvs.width  = Math.round(W * dpr);
      cvs.height = Math.round(H * dpr);
    }

    const ctx = cvs.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, tx * dpr, ty * dpr);

    const PAD = 20;
    const pos = {};
    if (!rootId) return;
    doLayout(rootId, PAD, PAD, pos, nm, ex);
    posRef.current = pos;

    // 画连线
    const drawEdges = (id) => {
      const n = nm[id];
      if (!ex.has(id) || !(n?.children || []).length) return;
      const p  = pos[id];
      const px = p.x + p.w / 2, py = p.y + p.h + TOG_R * 2 + 2;
      (n.children || []).forEach(c => {
        const cp = pos[c.id];
        if (!cp) return;
        const cx2 = cp.x + cp.w / 2, cy2 = cp.y, mid = (cy2 - py) / 2;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.bezierCurveTo(px, py + mid, cx2, cy2 - mid, cx2, cy2);
        ctx.strokeStyle = EDGE_COLOR;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        drawEdges(c.id);
      });
    };
    drawEdges(rootId);

    // 画节点
    const drawNode = (id) => {
      const n = nm[id], p = pos[id];
      if (!n || !p) return;
      const maxTW = p.w - 24;
      const col = PAL[n.color] || PAL["c-gray"];
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, RX);
      ctx.fillStyle = col.f;
      ctx.fill();
      ctx.strokeStyle = col.s;
      ctx.lineWidth = active === id ? 2 : 0.6;
      ctx.stroke();

      const cx = p.x + p.w / 2;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      ctx.font = `500 ${ROLE_SZ}px -apple-system,sans-serif`;
      ctx.fillStyle = col.ts;
      ctx.globalAlpha = 0.7;
      ctx.fillText(truncText(ctx, n.role || "", maxTW), cx, p.y + 10);
      ctx.globalAlpha = 1;

      ctx.font = `500 ${WORD_SZ}px -apple-system,sans-serif`;
      ctx.fillStyle = col.t;
      ctx.fillText(truncText(ctx, n.word || "", maxTW), cx, p.y + 10 + ROLE_SZ + 6);

      // 展开/收起按钮
      if ((n.children || []).length) {
        const togX = cx, togY = p.y + p.h + TOG_R + 1;
        ctx.beginPath();
        ctx.arc(togX, togY, TOG_R, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.strokeStyle = col.s;
        ctx.lineWidth = 0.6;
        ctx.stroke();
        ctx.font = `700 10px -apple-system,sans-serif`;
        ctx.fillStyle = col.s;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(ex.has(id) ? "−" : "+", togX, togY + 0.5);
      }

      if (ex.has(id)) {
        (n.children || []).forEach(c => drawNode(c.id));
      }
    };
    drawNode(rootId);
  }, [treeData, rootId]);

  // state 变化时重绘
  useEffect(() => { renderTree(); }, [renderTree]);

  // 容器尺寸变化时重绘
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver(() => renderTree());
    obs.observe(container);
    return () => obs.disconnect();
  }, [renderTree]);

  // ── 适应视图（fit to screen）────────────────────────────────────────────────
  const fitView = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs || !treeData || !Object.keys(nodeMapRef.current).length) return;
    const nm = nodeMapRef.current;
    const ex = expandedRef.current;
    if (!rootId) return;
    const PAD = 20;
    const tw = subtreeW(rootId, nm, ex) + PAD * 2;
    // 临时 layout 拿到树高
    const pos = {};
    doLayout(rootId, PAD, PAD, pos, nm, ex);
    const th = calcTreeH(rootId, pos, nm, ex) + PAD;
    const W = cvs.clientWidth, H = cvs.clientHeight;
    const newScale = Math.min(1, (W - 40) / tw, (H - 40) / th) * 0.95;
    transformRef.current = {
      tx: (W - tw * newScale) / 2,
      ty: 16,
      scale: newScale,
    };
    setScaleLabel(Math.round(newScale * 100));
    renderTree();
  }, [treeData, rootId, renderTree]);

  // tree 数据加载后初始化
  useEffect(() => {
    if (!treeData) return;
    const map = buildNodeMap(treeData);
    const allEx = new Set(Object.keys(map).filter(id => (map[id].children || []).length > 0));
    nodeMapRef.current = map;
    expandedRef.current = allEx;
    activeIdRef.current = null;
    setNodeMap(map);
    setExpanded(allEx);
    setActiveId(null);
    // 等 DOM 更新后 fit
    requestAnimationFrame(() => fitView());
  }, [treeData, fitView]);

  // ── 缩放（中心点缩放）────────────────────────────────────────────────────
  const zoomAround = useCallback((canvasCx, canvasCy, factor) => {
    const { tx, ty, scale } = transformRef.current;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * factor));
    const wCx = (canvasCx - tx) / scale;
    const wCy = (canvasCy - ty) / scale;
    transformRef.current = {
      tx: canvasCx - wCx * newScale,
      ty: canvasCy - wCy * newScale,
      scale: newScale,
    };
    setScaleLabel(Math.round(newScale * 100));
    renderTree();
  }, [renderTree]);

  const zoomAtCenter = useCallback((factor) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    zoomAround(cvs.clientWidth / 2, cvs.clientHeight / 2, factor);
  }, [zoomAround]);

  // ── 鼠标事件（平移 + 点击）───────────────────────────────────────────────
  const panRef    = useRef(null);
  const pinchRef  = useRef(null);
  const movedRef  = useRef(false);

  const screenToCanvas = useCallback((clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const hitTest = useCallback((cx, cy) => {
    const { tx, ty, scale } = transformRef.current;
    const wx = (cx - tx) / scale;
    const wy = (cy - ty) / scale;
    return Object.keys(posRef.current).find(id => {
      const p = posRef.current[id];
      if (!p) return false;
      const inNode = wx >= p.x && wx <= p.x + p.w && wy >= p.y && wy <= p.y + p.h;
      if (inNode) return true;
      if (!(nodeMapRef.current[id]?.children || []).length) return false;
      const dx = wx - (p.x + p.w / 2);
      const dy = wy - (p.y + p.h + TOG_R + 1);
      return dx * dx + dy * dy <= TOG_R * TOG_R;
    });
  }, []);

  const activateNode = useCallback((id) => {
    if ((nodeMapRef.current[id]?.children || []).length) {
      setExpanded(prev => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        expandedRef.current = next;
        return next;
      });
      activeIdRef.current = null;
      setActiveId(null);
    } else {
      const nxt = activeIdRef.current === id ? null : id;
      activeIdRef.current = nxt;
      setActiveId(nxt);
    }
  }, []);

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    movedRef.current = false;
    panRef.current = {
      startX: e.clientX, startY: e.clientY,
      startTx: transformRef.current.tx, startTy: transformRef.current.ty,
    };
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!panRef.current) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
    transformRef.current = {
      ...transformRef.current,
      tx: panRef.current.startTx + dx,
      ty: panRef.current.startTy + dy,
    };
    renderTree();
  }, [renderTree]);

  const handleMouseUp = useCallback(() => { panRef.current = null; }, []);

  const handleClick = useCallback((e) => {
    if (movedRef.current) return;
    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    const hit = hitTest(x, y);
    if (hit) activateNode(hit);
  }, [screenToCanvas, hitTest, activateNode]);

  // ── 鼠标滚轮缩放 ──────────────────────────────────────────────────────────
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const onWheel = (e) => {
      e.preventDefault();
      const { x, y } = screenToCanvas(e.clientX, e.clientY);
      const delta = e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY;
      zoomAround(x, y, 1 - delta * 0.001);
    };
    cvs.addEventListener("wheel", onWheel, { passive: false });
    return () => cvs.removeEventListener("wheel", onWheel);
  }, [screenToCanvas, zoomAround]);

  // ── 触摸事件（单指平移 + 双指缩放）──────────────────────────────────────
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      movedRef.current = false;
      pinchRef.current = null;
      panRef.current = {
        startX: e.touches[0].clientX, startY: e.touches[0].clientY,
        startTx: transformRef.current.tx, startTy: transformRef.current.ty,
      };
    } else if (e.touches.length === 2) {
      panRef.current = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const midClientX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midClientY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const { x: cx, y: cy } = screenToCanvas(midClientX, midClientY);
      pinchRef.current = {
        startDist: Math.sqrt(dx * dx + dy * dy),
        startScale: transformRef.current.scale,
        startTx: transformRef.current.tx,
        startTy: transformRef.current.ty,
        cx, cy,
      };
    }
  }, [screenToCanvas]);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / pinchRef.current.startDist;
      const { startScale, startTx, startTy, cx, cy } = pinchRef.current;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, startScale * ratio));
      const wCx = (cx - startTx) / startScale;
      const wCy = (cy - startTy) / startScale;
      transformRef.current = {
        tx: cx - wCx * newScale,
        ty: cy - wCy * newScale,
        scale: newScale,
      };
      setScaleLabel(Math.round(newScale * 100));
      renderTree();
    } else if (e.touches.length === 1 && panRef.current) {
      const dx = e.touches[0].clientX - panRef.current.startX;
      const dy = e.touches[0].clientY - panRef.current.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) movedRef.current = true;
      transformRef.current = {
        ...transformRef.current,
        tx: panRef.current.startTx + dx,
        ty: panRef.current.startTy + dy,
      };
      renderTree();
    }
  }, [renderTree]);

  const handleTouchEnd = useCallback((e) => {
    if (e.changedTouches.length === 1 && !movedRef.current && panRef.current) {
      const t = e.changedTouches[0];
      const { x, y } = screenToCanvas(t.clientX, t.clientY);
      const hit = hitTest(x, y);
      if (hit) activateNode(hit);
    }
    panRef.current  = null;
    pinchRef.current = null;
  }, [screenToCanvas, hitTest, activateNode]);

  if (!treeData) return null;
  const activeNode = activeId ? nodeMap[activeId] : null;

  return (
    <div className="gm-sentence-tree">
      <div className="gm-sentence-tree__header">
        <span className="gm-sentence-tree__title">句子结构思维导图</span>
        <div className="gm-sentence-tree__controls">
          <button type="button" onClick={() => zoomAtCenter(1.25)} title="放大">+</button>
          <span>{scaleLabel}%</span>
          <button type="button" onClick={() => zoomAtCenter(0.8)} title="缩小">-</button>
          <button type="button" className="gm-sentence-tree__reset" onClick={fitView} title="重置视图">重置</button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="gm-sentence-tree__viewport"
      >
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "100%", touchAction: "none", cursor: "grab" }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />

      </div>

      {/* 节点详情卡片 */}
      {activeNode && (
        <div className="gm-sentence-tree__card">
          <button
            className="gm-sentence-tree__card-close"
            onClick={() => { activeIdRef.current = null; setActiveId(null); }}
          >×</button>
          <div className="gm-sentence-tree__card-role">{activeNode.role}</div>
          <div className="gm-sentence-tree__card-word">{activeNode.word}</div>
          <div className="gm-sentence-tree__card-note">{activeNode.note}</div>
        </div>
      )}

      {/* 图例 */}
      <div className="gm-sentence-tree__legend">
        {[
          ["#EEEDFE", "#534AB7", "根节点"],
          ["#E1F5EE", "#0F6E56", "主语"],
          ["#FAECE7", "#993C1D", "谓语"],
          ["#FAEEDA", "#854F0B", "宾/表/补语"],
          ["#F1EFE8", "#5F5E5A", "定/状语·连词"],
        ].map(([bg, bd, label]) => (
          <div key={label} className="gm-sentence-tree__legend-item">
            <div className="gm-sentence-tree__legend-dot" style={{ background: bg, border: `0.5px solid ${bd}` }} />
            {label}
          </div>
        ))}
      </div>
      <p className="gm-sentence-tree__hint">
        滚轮缩放 · 拖拽移动 · 点击节点跳转知识点 · 点击 +/− 展开收起
      </p>
    </div>
  );
}
