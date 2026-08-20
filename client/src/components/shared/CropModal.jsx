/**
 * CropModal — 手机端拍照/选图后的裁剪界面
 * 使用方式：
 *   <CropModal src={dataUrl} onConfirm={croppedFile => ...} onCancel={() => ...} />
 */
import { useCallback, useEffect, useRef, useState } from "react";

import useBodyScrollLock from "../../hooks/useBodyScrollLock.js";

const MIN_SIZE = 60;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export default function CropModal({ src, onConfirm, onCancel }) {
  useBodyScrollLock(true);
  const imgRef = useRef(null);
  const [loaded, setLoaded] = useState(false);
  // box: position/size in viewport coords (fixed)
  const [box, setBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const drag = useRef(null); // { type:'move'|corner, corner, sx, sy, sb }

  // 图片加载后初始化裁剪框（居中 80%）
  const initBox = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const r = img.getBoundingClientRect();
    const size = Math.min(r.width, r.height) * 0.8;
    setBox({
      x: r.left + (r.width - size) / 2,
      y: r.top + (r.height - size) / 2,
      w: size,
      h: size,
    });
  }, []);

  useEffect(() => { if (loaded) initBox(); }, [loaded, initBox]);

  // 获取触摸/鼠标坐标
  const getPoint = (e) => {
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  };

  // 开始拖拽（移动或调整大小）
  const startDrag = (type, corner = null) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = getPoint(e);
    drag.current = { type, corner, sx: x, sy: y, sb: { ...box } };
  };

  // 拖拽中
  const onMove = useCallback((e) => {
    if (!drag.current || !imgRef.current) return;
    e.preventDefault();
    const { x, y } = getPoint(e);
    const dx = x - drag.current.sx;
    const dy = y - drag.current.sy;
    const sb = drag.current.sb;
    const ir = imgRef.current.getBoundingClientRect(); // 图片边界

    if (drag.current.type === 'move') {
      setBox({
        ...sb,
        x: clamp(sb.x + dx, ir.left, ir.right - sb.w),
        y: clamp(sb.y + dy, ir.top, ir.bottom - sb.h),
      });
    } else {
      const c = drag.current.corner;
      let { x: bx, y: by, w: bw, h: bh } = sb;

      if (c === 'se') {
        bw = clamp(sb.w + dx, MIN_SIZE, ir.right - sb.x);
        bh = clamp(sb.h + dy, MIN_SIZE, ir.bottom - sb.y);
      } else if (c === 'sw') {
        const nx = clamp(sb.x + dx, ir.left, sb.x + sb.w - MIN_SIZE);
        bw = sb.w - (nx - sb.x);
        bx = nx;
        bh = clamp(sb.h + dy, MIN_SIZE, ir.bottom - sb.y);
      } else if (c === 'ne') {
        const ny = clamp(sb.y + dy, ir.top, sb.y + sb.h - MIN_SIZE);
        bh = sb.h - (ny - sb.y);
        by = ny;
        bw = clamp(sb.w + dx, MIN_SIZE, ir.right - sb.x);
      } else if (c === 'nw') {
        const nx = clamp(sb.x + dx, ir.left, sb.x + sb.w - MIN_SIZE);
        const ny = clamp(sb.y + dy, ir.top, sb.y + sb.h - MIN_SIZE);
        bw = sb.w - (nx - sb.x);
        bh = sb.h - (ny - sb.y);
        bx = nx;
        by = ny;
      }
      setBox({ x: bx, y: by, w: bw, h: bh });
    }
  }, []);

  const endDrag = useCallback(() => { drag.current = null; }, []);

  // 确认裁剪：用 Canvas 截取
  const handleConfirm = () => {
    const img = imgRef.current;
    if (!img) return;
    const r = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / r.width;
    const scaleY = img.naturalHeight / r.height;
    const cropX = Math.max(0, (box.x - r.left) * scaleX);
    const cropY = Math.max(0, (box.y - r.top) * scaleY);
    const cropW = Math.min(box.w * scaleX, img.naturalWidth - cropX);
    const cropH = Math.min(box.h * scaleY, img.naturalHeight - cropY);

    const canvas = document.createElement("canvas");
    canvas.width = cropW;
    canvas.height = cropH;
    canvas.getContext("2d").drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
    canvas.toBlob(
      (blob) => onConfirm(new File([blob], "photo.jpg", { type: "image/jpeg" })),
      "image/jpeg",
      0.9
    );
  };

  const handleStyle = {
    position: "absolute",
    width: 24,
    height: 24,
    background: "#fff",
    borderRadius: "50%",
    boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
    touchAction: "none",
  };

  return (
    <div
      className="crop-modal"
      onTouchMove={onMove}
      onTouchEnd={endDrag}
      onMouseMove={onMove}
      onMouseUp={endDrag}
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "#111",
        display: "flex", flexDirection: "column",
        touchAction: "none",
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        background: "#1a1a1a",
        color: "#fff",
        flexShrink: 0,
      }}>
        <button type="button"
          onClick={onCancel}
          style={{ background: "none", border: "none", color: "#aaa", fontSize: 15, cursor: "pointer", padding: "4px 8px" }}
        >取消</button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>裁剪图片</span>
        <button type="button"
          onClick={handleConfirm}
          style={{
            background: "#c8872d", border: "none", color: "#fff",
            fontWeight: 700, fontSize: 15, borderRadius: 8,
            padding: "6px 16px", cursor: "pointer",
          }}
        >确认</button>
      </div>

      {/* Image area */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <img
          ref={imgRef}
          src={src}
          alt="裁剪预览"
          onLoad={() => setLoaded(true)}
          draggable={false}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            userSelect: "none",
            display: "block",
          }}
        />

        {/* 裁剪框：用 box-shadow 实现暗色蒙版 */}
        {loaded && (
          <div
            onTouchStart={startDrag("move")}
            onMouseDown={startDrag("move")}
            style={{
              position: "fixed",
              left: box.x,
              top: box.y,
              width: box.w,
              height: box.h,
              border: "2px solid rgba(255,255,255,0.9)",
              boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
              cursor: "move",
              touchAction: "none",
              userSelect: "none",
            }}
          >
            {/* 网格线 */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)", backgroundSize: "33.33% 33.33%" }} />

            {/* 四角句柄 */}
            {[
              { c: "nw", style: { top: -12, left: -12, cursor: "nw-resize" } },
              { c: "ne", style: { top: -12, right: -12, cursor: "ne-resize" } },
              { c: "sw", style: { bottom: -12, left: -12, cursor: "sw-resize" } },
              { c: "se", style: { bottom: -12, right: -12, cursor: "se-resize" } },
            ].map(({ c, style }) => (
              <div
                key={c}
                onTouchStart={startDrag("corner", c)}
                onMouseDown={startDrag("corner", c)}
                style={{ ...handleStyle, ...style }}
              />
            ))}
          </div>
        )}
      </div>

      {/* 提示文字 */}
      <div style={{ textAlign: "center", color: "#888", fontSize: 12, padding: "10px 0 14px", flexShrink: 0 }}>
        拖动裁剪框调整范围，拖动四角可缩放
      </div>
    </div>
  );
}
