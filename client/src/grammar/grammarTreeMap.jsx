import { useRef, useEffect, useState, useCallback } from "react";

import { GRAMMAR_TREE } from "./grammarTree.js";

const DEPTH_COLORS = [
  { fill: "#5c3d9e", text: "#fff", stroke: "#4a2f85" },
  { fill: "#eeedfe", text: "#3c3489", stroke: "#534ab7" },
  { fill: "#e1f5ee", text: "#085041", stroke: "#0f6e56" },
  { fill: "#f1efe8", text: "#444441", stroke: "#5f5e5a" },
  { fill: "#faeeda", text: "#633806", stroke: "#854f0b" },
];

const NODE_MIN_W = 72;
const NODE_MAX_W = 190;
const NODE_H = 36;
const H_GAP = 28;
const V_GAP = 14;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function textWidth(text) {
  return Array.from(text || "").reduce((sum, ch) => sum + (ch.charCodeAt(0) <= 0x7f ? 6 : 12), 0);
}

function nodeWidth(node) {
  const toggle = node._children?.length && node.id !== "__root__" ? 18 : 0;
  return clamp(textWidth(node.title) + 30 + toggle, NODE_MIN_W, NODE_MAX_W);
}

function fitText(text, maxWidth) {
  if (textWidth(text) <= maxWidth) return text;
  let value = text;
  while (value.length > 1 && textWidth(`${value}…`) > maxWidth) value = value.slice(0, -1);
  return `${value}…`;
}

function buildTree(nodes, depth = 0) {
  return nodes.map((node) => ({
    ...node,
    depth,
    _children: node.children ? buildTree(node.children, depth + 1) : [],
  }));
}

function layoutTree(nodes, collapsed) {
  const positions = {};
  const columnWidths = [];

  function getHeight(node) {
    if (!node._children || node._children.length === 0) return 1;
    if (collapsed.has(node.id)) return 1;
    return node._children.reduce((s, c) => s + getHeight(c), 0);
  }

  function collectWidths(node) {
    columnWidths[node.depth] = Math.max(columnWidths[node.depth] || 0, nodeWidth(node));
    if (!collapsed.has(node.id)) node._children?.forEach(collectWidths);
  }

  function depthX(depth) {
    return columnWidths.slice(0, depth).reduce((sum, width) => sum + width + H_GAP, 0);
  }

  function layout(node, yStart) {
    const h = getHeight(node);
    const y = yStart + (h - 1) * (NODE_H + V_GAP) / 2;
    positions[node.id] = { x: depthX(node.depth), y, w: nodeWidth(node), node };

    if (!collapsed.has(node.id) && node._children && node._children.length > 0) {
      let cy = yStart;
      node._children.forEach((child) => {
        const ch = getHeight(child);
        layout(child, cy);
        cy += ch * (NODE_H + V_GAP);
      });
    }
  }

  const root = {
    id: "__root__",
    title: "语法体系",
    depth: 0,
    _children: buildTree(nodes),
  };

  collectWidths(root);
  layout(root, 0);

  const allY = Object.values(positions).map(p => p.y);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  Object.values(positions).forEach(p => { p.y -= minY; });

  const totalH = maxY - minY + NODE_H;
  const totalW = columnWidths.reduce((sum, width, index) => sum + width + (index ? H_GAP : 0), 0);

  return { positions, totalW, totalH };
}

export default function GrammarTreeMap({ onNodeClick }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.7);
  const [offset, setOffset] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [collapsed, setCollapsed] = useState(new Set());

  function toggleCollapse(id, e) {
    e.stopPropagation();
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const { positions, totalW, totalH } = layoutTree(GRAMMAR_TREE, collapsed);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  }, [offset]);

  const onMouseMove = useCallback((e) => {
    if (!dragging || !dragStart) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const onMouseUp = useCallback(() => {
    setDragging(false);
    setDragStart(null);
  }, []);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.min(3, Math.max(0.2, s * delta)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  function renderEdges() {
    const edges = [];
    Object.values(positions).forEach(({ x, y, w, node }) => {
      if (!node._children || collapsed.has(node.id)) return;
      node._children.forEach((child) => {
        const cp = positions[child.id];
        if (!cp) return;
        const x1 = x + w;
        const y1 = y + NODE_H / 2;
        const x2 = cp.x;
        const y2 = cp.y + NODE_H / 2;
        const mx = (x1 + x2) / 2;
        edges.push(
          <path
            key={`${node.id}-${child.id}`}
            d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
            fill="none"
            stroke="rgba(92,61,158,0.2)"
            strokeWidth={1.5}
          />
        );
      });
    });
    return edges;
  }

  function renderNodes() {
    return Object.values(positions).map(({ x, y, w, node }) => {
      const col = DEPTH_COLORS[Math.min(node.depth, DEPTH_COLORS.length - 1)];
      const isHovered = hovered === node.id;
      const isClickable = node.id !== "__root__";
      const hasKids = node._children && node._children.length > 0;
      const isCollapsed = collapsed.has(node.id);
      const bodyW = hasKids && node.id !== "__root__" ? w - 18 : w;

      return (
        <g
          key={node.id}
          transform={`translate(${x},${y})`}
          onMouseEnter={() => setHovered(node.id)}
          onMouseLeave={() => setHovered(null)}
        >
          {/* 节点主体 — 点击跳转 */}
          <rect
            width={bodyW}
            height={NODE_H}
            rx={8}
            fill={col.fill}
            stroke={col.stroke}
            strokeWidth={isHovered ? 2 : 0.8}
            opacity={isHovered ? 1 : 0.92}
            style={{ cursor: isClickable ? "pointer" : "default" }}
            onClick={(e) => {
              e.stopPropagation();
              if (isClickable && onNodeClick) onNodeClick(node.id);
            }}
          />
          <text
            x={bodyW / 2}
            y={NODE_H / 2 + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={col.text}
            fontSize={node.depth === 0 ? 12 : 11}
            fontWeight={node.depth <= 1 ? 700 : 600}
            fontFamily="-apple-system, sans-serif"
            style={{ cursor: isClickable ? "pointer" : "default", pointerEvents: "none" }}
          >
            {fitText(node.title, bodyW - 18)}
          </text>

          {/* 加减号按钮 — 点击折叠 */}
          {hasKids && node.id !== "__root__" && (
            <g
              transform={`translate(${w - 16}, ${NODE_H / 2 - 8})`}
              onClick={(e) => toggleCollapse(node.id, e)}
              style={{ cursor: "pointer" }}
            >
              <rect width={16} height={16} rx={4} fill={col.stroke} />
              <text
                x={8} y={9}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize={12}
                fontWeight={900}
                fontFamily="-apple-system, sans-serif"
              >
                {isCollapsed ? "+" : "−"}
              </text>
            </g>
          )}
        </g>
      );
    });
  }

  const svgW = totalW + NODE_MAX_W + 40;
  const svgH = totalH + NODE_H + 40;

  return (
    <div className="gc-treemap">
      <div className="gc-treemap__header">
        <span className="gc-treemap__title">语法知识体系总览</span>
        <div className="gc-treemap__controls">
          <button type="button" onClick={() => setScale(s => Math.min(3, s + 0.1))}>+</button>
          <span>{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale(s => Math.max(0.2, s - 0.1))}>−</button>
          <button type="button" className="gc-treemap__reset" onClick={() => { setScale(0.7); setOffset({ x: 20, y: 20 }); setCollapsed(new Set()); }}>重置</button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="gc-treemap__canvas"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        <svg
          width={svgW}
          height={svgH}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            transition: dragging ? "none" : "transform 0.05s",
          }}
        >
          <g>{renderEdges()}</g>
          <g>{renderNodes()}</g>
        </svg>
      </div>

      <p className="gc-treemap__hint">滚轮缩放 · 拖拽移动 · 点击节点跳转知识点 · 点击 +/− 展开收起</p>
    </div>
  );
}
