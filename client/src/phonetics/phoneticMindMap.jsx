import { useCallback, useEffect, useRef, useState } from "react";

const PHONETICS_TREE = [
  {
    id: "phonetics-sound",
    title: "音素",
    children: [
      {
        id: "phonetics-vowels",
        title: "元音",
        children: [
          {
            id: "phonetics-monophthongs",
            title: "单元音",
            children: [
              { id: "phonetics-vowels-length", title: "按长短音分" },
              { id: "phonetics-vowels-letters", title: "按元音字母 a、e、i、o、u 分" },
            ],
          },
          {
            id: "phonetics-diphthongs",
            title: "双元音",
            children: [
              { id: "phonetics-diphthongs-i", title: "+ɪ" },
              { id: "phonetics-diphthongs-u", title: "+ʊ" },
              { id: "phonetics-diphthongs-schwa", title: "+ə" },
            ],
          },
        ],
      },
      {
        id: "phonetics-consonants",
        title: "辅音",
        children: [
          {
            id: "phonetics-voicing",
            title: "清浊分类",
            children: [
              { id: "phonetics-voiceless", title: "清辅音" },
              { id: "phonetics-voiced", title: "浊辅音" },
            ],
          },
          {
            id: "phonetics-consonant-types",
            title: "其他分类方式",
            children: [
              { id: "phonetics-fricatives", title: "摩擦音" },
              { id: "phonetics-plosives", title: "爆破音" },
              { id: "phonetics-affricates", title: "破擦音" },
              { id: "phonetics-nasals", title: "鼻音" },
              { id: "phonetics-lateral", title: "边辅音" },
              { id: "phonetics-liquid", title: "流音" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "phonetics-syllable",
    title: "音节",
    children: [
      {
        id: "phonetics-syllable-overview",
        title: "总览",
        children: [
          { id: "phonetics-syllable-what", title: "音节是什么" },
          { id: "phonetics-syllable-divide", title: "怎么划分音节" },
          { id: "phonetics-syllable-count", title: "怎么数音节" },
        ],
      },
      {
        id: "phonetics-syllable-types",
        title: "分类",
        children: [
          { id: "phonetics-open-closed", title: "开音节与闭音节" },
          { id: "phonetics-syllable-stress", title: "主重读音节与次重读音节" },
        ],
      },
    ],
  },
  {
    id: "phonetics-sentence",
    title: "句子",
    children: [
      {
        id: "phonetics-prosody",
        title: "韵律",
        children: [
          {
            id: "phonetics-stress-weak",
            title: "重读与弱读",
            children: [
              { id: "phonetics-stress", title: "重读：名词、动词、形容词、副词" },
              { id: "phonetics-weak", title: "弱读：介词、连词、冠词、代词" },
            ],
          },
          { id: "phonetics-pause", title: "停顿", children: [{ id: "phonetics-sense-group", title: "按照意群划分" }] },
          { id: "phonetics-intonation", title: "语调", children: [{ id: "phonetics-rising", title: "升调" }, { id: "phonetics-falling", title: "降调" }] },
        ],
      },
      {
        id: "phonetics-flow",
        title: "语流现象",
        children: [
          {
            id: "phonetics-linking",
            title: "连读",
            children: [
              {
                id: "phonetics-vowel-vowel",
                title: "元音 + 元音",
                children: [
                  { id: "phonetics-w", title: "/w/" },
                  { id: "phonetics-j", title: "/j/" },
                ],
              },
              { id: "phonetics-consonant-vowel", title: "辅音 + 元音" },
              {
                id: "phonetics-linking-other",
                title: "其他",
                children: [
                  { id: "phonetics-r-linking", title: "R连读" },
                  { id: "phonetics-r-intrusion", title: "R插入连读" },
                ],
              },
            ],
          },
          {
            id: "phonetics-loss-plosion",
            title: "失去爆破",
            children: [
              {
                id: "phonetics-plosive-plus",
                title: "爆破音 +",
                children: [
                  { id: "phonetics-plosive-fricative", title: "摩擦音" },
                  { id: "phonetics-plosive-plosive", title: "爆破音" },
                  { id: "phonetics-plosive-nasal", title: "鼻音" },
                ],
              },
            ],
          },
          {
            id: "phonetics-assimilation",
            title: "同化",
            children: [
              { id: "phonetics-t-j", title: "/t/ + /j/" },
              { id: "phonetics-d-j", title: "/d/ + /j/" },
              { id: "phonetics-s-j", title: "/s/ + /j/" },
              { id: "phonetics-z-j", title: "/z/ + /j/" },
            ],
          },
          {
            id: "phonetics-flow-other",
            title: "其他",
            children: [
              {
                id: "phonetics-unstressed-t",
                title: "非重读音节中的 /t/",
                children: [
                  { id: "phonetics-flap", title: "闪音" },
                  { id: "phonetics-glottal", title: "喉塞音" },
                ],
              },
              { id: "phonetics-reduction", title: "约化表达" },
              { id: "phonetics-contraction", title: "缩读" },
              { id: "phonetics-elision", title: "省音" },
            ],
          },
        ],
      },
    ],
  },
  { id: "phonetics-discourse", title: "语篇" },
];

const DEPTH_COLORS = [
  { fill: "#d95f98", text: "#fff", stroke: "#b83f78" },
  { fill: "#fde4ef", text: "#6c1d43", stroke: "#d95f98" },
  { fill: "#fff", text: "#4d1732", stroke: "#ec9abd" },
];

const NODE_MIN_W = 72;
const NODE_MAX_W = 200;
const NODE_H = 36;
const H_GAP = 28;
const V_GAP = 14;
const CLICK_TARGETS = new Map([
  ["phonetics-sound", "phonetics-sound"],
  ["phonetics-vowels", "phonetics-sound"],
  ["phonetics-consonants", "phonetics-sound"],
  ["phonetics-syllable", "phonetics-syllable"],
  ["phonetics-sentence", "phonetics-sentence"],
  ["phonetics-prosody", "phonetics-sentence"],
  ["phonetics-flow", "phonetics-sentence"],
  ["phonetics-discourse", "phonetics-discourse"],
]);
const DEFAULT_COLLAPSED = new Set([
  "phonetics-vowels",
  "phonetics-consonants",
  "phonetics-syllable",
  "phonetics-prosody",
  "phonetics-flow",
]);

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
  while (value.length > 1 && textWidth(`${value}...`) > maxWidth) value = value.slice(0, -1);
  return `${value}...`;
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
  const children = buildTree(nodes, 1);
  const root = { id: "__root__", title: "语音", depth: 0, _children: children };

  function getHeight(node) {
    if (!node._children?.length || collapsed.has(node.id)) return 1;
    return node._children.reduce((sum, child) => sum + getHeight(child), 0);
  }

  function collectWidths(node) {
    columnWidths[node.depth] = Math.max(columnWidths[node.depth] || 0, nodeWidth(node));
    if (!collapsed.has(node.id)) node._children?.forEach(collectWidths);
  }

  function depthX(depth) {
    return columnWidths.slice(0, depth).reduce((sum, width) => sum + width + H_GAP, 0);
  }

  function layout(node, yStart) {
    const height = getHeight(node);
    const y = yStart + ((height - 1) * (NODE_H + V_GAP)) / 2;
    positions[node.id] = { x: depthX(node.depth), y, w: nodeWidth(node), node };

    if (!collapsed.has(node.id) && node._children?.length) {
      let childY = yStart;
      node._children.forEach((child) => {
        const childHeight = getHeight(child);
        layout(child, childY);
        childY += childHeight * (NODE_H + V_GAP);
      });
    }
  }

  collectWidths(root);
  layout(root, 0);

  const ys = Object.values(positions).map((position) => position.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  Object.values(positions).forEach((position) => { position.y -= minY; });

  return {
    positions,
    totalH: maxY - minY + NODE_H,
    totalW: columnWidths.reduce((sum, width, index) => sum + width + (index ? H_GAP : 0), 0),
  };
}

export default function PhoneticMindMap({ onNavigate }) {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.7);
  const [offset, setOffset] = useState({ x: 20, y: 20 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const [hovered, setHovered] = useState(null);
  const [collapsed, setCollapsed] = useState(() => new Set(DEFAULT_COLLAPSED));
  const { positions, totalW, totalH } = layoutTree(PHONETICS_TREE, collapsed);

  function toggleCollapse(id, event) {
    event.stopPropagation();
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const onMouseDown = useCallback((event) => {
    if (event.button !== 0) return;
    setDragging(true);
    setDragStart({ x: event.clientX - offset.x, y: event.clientY - offset.y });
  }, [offset]);

  const onMouseMove = useCallback((event) => {
    if (!dragging || !dragStart) return;
    setOffset({ x: event.clientX - dragStart.x, y: event.clientY - dragStart.y });
  }, [dragging, dragStart]);

  const onMouseUp = useCallback(() => {
    setDragging(false);
    setDragStart(null);
  }, []);

  const onWheel = useCallback((event) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    setScale((current) => Math.min(3, Math.max(0.2, current * delta)));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  function renderEdges() {
    return Object.values(positions).flatMap(({ x, y, w, node }) => {
      if (!node._children?.length || collapsed.has(node.id)) return [];
      return node._children.map((child) => {
        const childPosition = positions[child.id];
        if (!childPosition) return null;
        const x1 = x + w;
        const y1 = y + NODE_H / 2;
        const x2 = childPosition.x;
        const y2 = childPosition.y + NODE_H / 2;
        const mx = (x1 + x2) / 2;
        return (
          <path
            key={`${node.id}-${child.id}`}
            d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`}
            fill="none"
            stroke="rgba(184, 63, 120, 0.26)"
            strokeDasharray="6 5"
            strokeWidth={2}
          />
        );
      });
    });
  }

  function renderNodes() {
    return Object.values(positions).map(({ x, y, w, node }) => {
      const color = DEPTH_COLORS[Math.min(node.depth, DEPTH_COLORS.length - 1)];
      const hasKids = !!node._children?.length;
      const isRoot = node.id === "__root__";
      const target = CLICK_TARGETS.get(node.id);
      const width = hasKids && !isRoot ? w - 18 : w;
      const isHovered = hovered === node.id;

      return (
        <g
          key={node.id}
          transform={`translate(${x},${y})`}
          onMouseEnter={() => setHovered(node.id)}
          onMouseLeave={() => setHovered(null)}
        >
          <rect
            width={width}
            height={NODE_H}
            rx={8}
            fill={color.fill}
            stroke={color.stroke}
            strokeWidth={isHovered ? 2 : 0.8}
            opacity={isHovered ? 1 : 0.94}
            style={{ cursor: target ? "pointer" : "default" }}
            onClick={(event) => {
              event.stopPropagation();
              if (target) onNavigate?.(target);
            }}
          />
          <text
            x={width / 2}
            y={NODE_H / 2 + 1}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={color.text}
            fontSize={isRoot ? 12 : 11}
            fontWeight={node.depth <= 1 ? 700 : 600}
            fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
            style={{ pointerEvents: "none" }}
          >
            {fitText(node.title, width - 18)}
          </text>

          {hasKids && !isRoot && (
            <g
              transform={`translate(${w - 16}, ${NODE_H / 2 - 8})`}
              onClick={(event) => toggleCollapse(node.id, event)}
              style={{ cursor: "pointer" }}
            >
              <rect width={16} height={16} rx={4} fill={color.stroke} />
              <text
                x={8}
                y={9}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#fff"
                fontSize={12}
                fontWeight={900}
                fontFamily="-apple-system, sans-serif"
              >
                {collapsed.has(node.id) ? "+" : "-"}
              </text>
            </g>
          )}
        </g>
      );
    });
  }

  return (
    <div className="ph-treemap">
      <div className="ph-treemap__header">
        <span className="ph-treemap__title">语音知识体系总览</span>
        <div className="ph-treemap__controls">
          <button type="button" onClick={() => setScale((current) => Math.min(3, current + 0.1))}>+</button>
          <span>{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale((current) => Math.max(0.2, current - 0.1))}>-</button>
          <button type="button" className="ph-treemap__reset" onClick={() => { setScale(0.7); setOffset({ x: 20, y: 20 }); setCollapsed(new Set(DEFAULT_COLLAPSED)); }}>重置</button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="ph-treemap__canvas"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ cursor: dragging ? "grabbing" : "grab" }}
      >
        <svg
          width={totalW + NODE_MAX_W + 40}
          height={totalH + NODE_H + 40}
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

      <p className="ph-treemap__hint">滚轮缩放 · 拖拽移动 · 点击节点跳转知识点 · 点击 +/− 展开收起</p>
    </div>
  );
}
