import { useEffect, useRef, useState } from "react";

import { COLORS } from "../../constants/index.jsx";

function drawTextCanvas(ctx, canvas, text) {
  canvas.width = 400;
  canvas.height = 300;
  ctx.fillStyle = "#faf8f5";
  ctx.fillRect(0, 0, 400, 300);
  ctx.font = "14px Georgia";
  ctx.fillStyle = "#2a1f14";
  text
    .split("\n")
    .slice(0, 10)
    .forEach((line, index) => ctx.fillText(line, 20, 30 + index * 20));
}

function restoreOverlay(ctx, initialDrawing) {
  if (!initialDrawing) return;
  const overlay = new Image();
  overlay.onload = () => ctx.drawImage(overlay, 0, 0);
  overlay.src = initialDrawing;
}

export function AnnotationCanvas({ image, text, onSave, initialDrawing }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState(COLORS[0]);
  const [startPos, setStartPos] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    if (image) {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 400;
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, maxWidth, canvas.height);
        restoreOverlay(ctx, initialDrawing);
      };
      img.src = `data:${image.mediaType};base64,${image.base64}`;
      return;
    }

    if (text) {
      drawTextCanvas(ctx, canvas, text);
      restoreOverlay(ctx, initialDrawing);
    }
  }, [image, initialDrawing, text]);

  const getPos = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (event.clientX ?? event.touches?.[0]?.clientX) - rect.left,
      y: (event.clientY ?? event.touches?.[0]?.clientY) - rect.top,
    };
  };

  const startDraw = (event) => {
    setIsDrawing(true);
    const nextStartPos = getPos(event);
    setStartPos(nextStartPos);
    const ctx = canvasRef.current.getContext("2d");
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (tool === "pen") {
      ctx.beginPath();
      ctx.moveTo(nextStartPos.x, nextStartPos.y);
    }
  };

  const draw = (event) => {
    if (!isDrawing) return;
    const pos = getPos(event);
    const ctx = canvasRef.current.getContext("2d");
    if (tool === "pen") {
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  const stopDraw = (event) => {
    if (!isDrawing) return;
    const pos = getPos(event);
    const ctx = canvasRef.current.getContext("2d");

    if (tool === "line" && startPos) {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "wave" && startPos) {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      const steps = Math.hypot(pos.x - startPos.x, pos.y - startPos.y) / 5;
      for (let index = 0; index < steps; index += 1) {
        ctx.lineTo(
          startPos.x + (pos.x - startPos.x) * (index / steps),
          startPos.y + (pos.y - startPos.y) * (index / steps) + Math.sin(index * 0.5) * 3
        );
      }
      ctx.stroke();
    } else if (tool === "rect" && startPos) {
      ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
    }

    setIsDrawing(false);
    setStartPos(null);
    onSave?.(canvasRef.current.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (image) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = `data:${image.mediaType};base64,${image.base64}`;
    } else if (text) {
      drawTextCanvas(ctx, canvas, text);
    }

    onSave?.(null);
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {[
          ["pen", "画笔"],
          ["line", "直线"],
          ["wave", "波浪"],
          ["rect", "方框"],
        ].map(([nextTool, label]) => (
          <button
            key={nextTool}
            type="button"
            onClick={() => setTool(nextTool)}
            style={{
              padding: "4px 12px",
              borderRadius: 20,
              fontSize: 12,
              border: tool === nextTool ? "2px solid #c8852a" : "1px solid #d8cfc4",
              background: tool === nextTool ? "#fdf0d8" : "#fff",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
        <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
          {COLORS.map((nextColor) => (
            <button
              key={nextColor}
              type="button"
              onClick={() => setColor(nextColor)}
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: nextColor,
                border: color === nextColor ? "2px solid #2a1f14" : "1px solid #d8cfc4",
                cursor: "pointer",
              }}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={clearCanvas}
          style={{
            padding: "4px 12px",
            background: "#fdf0ef",
            border: "1px solid #f0b0a8",
            borderRadius: 20,
            color: "#b02020",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          清空标注
        </button>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
        style={{
          border: "1px solid #d8cfc4",
          borderRadius: 8,
          cursor: "crosshair",
          width: "100%",
          maxWidth: 400,
        }}
      />
    </div>
  );
}
