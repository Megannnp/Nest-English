// src/components/shared/index.jsx
import { useState, useRef, useEffect } from 'react';

import { GRADES, COLORS } from '../../constants/index.jsx';

/** Grade badge — renders 优/良/中/差 with matching colours */
export function GradeBadge({ grade, size = 'sm' }) {
  const g = GRADES[grade] || GRADES['中'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      padding: size === 'lg' ? '6px 20px' : '2px 10px',
      borderRadius: 20,
      fontSize: size === 'lg' ? 18 : 12,
      fontWeight: 700,
      color: g.color, background: g.bg,
      border: `1.5px solid ${g.border}`,
      fontFamily: 'sans-serif', letterSpacing: size === 'lg' ? 2 : 1,
    }}>{grade}</span>
  );
}

/** Tag selector with single/multi select and custom tag add */
export function TagSelector({ label, labelZh, tags, setTags, selected, setSelected, single = false }) {
  const [val, setVal] = useState('');
  const [show, setShow] = useState(false);

  const toggle = (t) =>
    single
      ? setSelected(selected === t ? '' : t)
      : setSelected(selected.includes(t) ? selected.filter(x => x !== t) : [...selected, t]);

  const add = () => {
    const v = val.trim();
    if (v && !tags.includes(v)) {
      setTags([...tags, v]);
      if (single) setSelected(v);
      else setSelected([...selected, v]);
    }
    setVal(''); setShow(false);
  };

  const sel = (t) => (single ? selected === t : selected.includes(t));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: '#7c5c2e', letterSpacing: 2, fontFamily: 'monospace', textTransform: 'uppercase', fontWeight: 700 }}>{label}</span>
        {labelZh && <span style={{ fontSize: 11, color: '#a09080', fontFamily: 'sans-serif' }}>{labelZh}</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, alignItems: 'center' }}>
        {tags.map(t => (
          <button key={t} onClick={() => toggle(t)} style={{
            padding: '4px 13px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontFamily: 'sans-serif',
            border: sel(t) ? '1.5px solid #c8852a' : '1px solid #d8cfc4',
            background: sel(t) ? '#fdf0d8' : '#faf8f5',
            color: sel(t) ? '#8b5e1a' : '#8a7d6e',
          }}>{t}</button>
        ))}
        {show ? (
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <input
              autoFocus aria-label="添加标签" value={val}
              onChange={e => setVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') add(); if (e.key === 'Escape') setShow(false); }}
              placeholder="Enter后添加"
              style={{ background: '#faf8f5', border: '1px solid #c8852a', borderRadius: 20, padding: '4px 11px', color: '#3a2a18', fontSize: 13, outline: 'none', width: 110, fontFamily: 'sans-serif' }}
            />
            <button onClick={add} style={{ background: '#fdf0d8', border: '1px solid #c8852a', borderRadius: 20, color: '#8b5e1a', padding: '4px 9px', cursor: 'pointer', fontSize: 12 }}>✓</button>
            <button onClick={() => setShow(false)} style={{ background: 'transparent', border: 'none', color: '#a09080', cursor: 'pointer', fontSize: 14 }}>✕</button>
          </div>
        ) : (
          <button onClick={() => setShow(true)} style={{ padding: '4px 11px', borderRadius: 20, fontSize: 12, border: '1px dashed #c8a87a', background: 'transparent', color: '#a09080', cursor: 'pointer', fontFamily: 'sans-serif' }}>+ 自定义</button>
        )}
      </div>
    </div>
  );
}

/** Annotation canvas — draw on top of image or text */
export function AnnotationCanvas({ image, text, onSave, initialDrawing }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [startPos, setStartPos] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    if (image) {
      const img = new Image();
      img.onload = () => {
        const maxW = 400;
        const scale = maxW / img.width;
        canvas.width = maxW;
        canvas.height = img.height * scale;
        ctx.drawImage(img, 0, 0, maxW, img.height * scale);
        if (initialDrawing) {
          const overlay = new Image();
          overlay.onload = () => ctx.drawImage(overlay, 0, 0);
          overlay.src = initialDrawing;
        }
      };
      img.src = `data:${image.mediaType};base64,${image.base64}`;
    } else if (text) {
      canvas.width = 400; canvas.height = 300;
      ctx.fillStyle = '#faf8f5'; ctx.fillRect(0, 0, 400, 300);
      ctx.font = '14px Georgia'; ctx.fillStyle = '#2a1f14';
      text.split('\n').slice(0, 10).forEach((line, i) => ctx.fillText(line, 20, 30 + i * 20));
      if (initialDrawing) {
        const overlay = new Image();
        overlay.onload = () => ctx.drawImage(overlay, 0, 0);
        overlay.src = initialDrawing;
      }
    }
  }, [image, text, initialDrawing]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const cx = e.clientX ?? e.touches?.[0]?.clientX;
    const cy = e.clientY ?? e.touches?.[0]?.clientY;
    return { x: cx - rect.left, y: cy - rect.top };
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const pos = getPos(e);
    setStartPos(pos);
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    if (tool === 'pen') { ctx.beginPath(); ctx.moveTo(pos.x, pos.y); }
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    if (tool === 'pen') { ctx.lineTo(pos.x, pos.y); ctx.stroke(); }
  };

  const stopDrawing = (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    const ctx = canvasRef.current.getContext('2d');
    if (tool === 'line' && startPos) {
      ctx.beginPath(); ctx.moveTo(startPos.x, startPos.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    } else if (tool === 'wave' && startPos) {
      ctx.beginPath(); ctx.moveTo(startPos.x, startPos.y);
      const dist = Math.sqrt((pos.x - startPos.x) ** 2 + (pos.y - startPos.y) ** 2);
      const steps = dist / 5;
      for (let i = 0; i < steps; i++) {
        const x = startPos.x + (pos.x - startPos.x) * (i / steps);
        const y = startPos.y + (pos.y - startPos.y) * (i / steps) + Math.sin(i * 0.5) * 3;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else if (tool === 'rect' && startPos) {
      ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
    }
    setIsDrawing(false); setStartPos(null);
    if (onSave) onSave(canvasRef.current.toDataURL());
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (image) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = `data:${image.mediaType};base64,${image.base64}`;
    } else if (text) {
      ctx.fillStyle = '#faf8f5'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '14px Georgia'; ctx.fillStyle = '#2a1f14';
      text.split('\n').slice(0, 10).forEach((line, i) => ctx.fillText(line, 20, 30 + i * 20));
    }
    if (onSave) onSave(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {['pen', 'line', 'wave', 'rect'].map(t => (
          <button key={t} onClick={() => setTool(t)} style={{
            padding: '4px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
            border: tool === t ? '2px solid #c8852a' : '1px solid #d8cfc4',
            background: tool === t ? '#fdf0d8' : '#fff',
          }}>{t === 'pen' ? '画笔' : t === 'line' ? '直线' : t === 'wave' ? '波浪' : '方框'}</button>
        ))}
        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} style={{
              width: 24, height: 24, borderRadius: '50%', background: c, cursor: 'pointer',
              border: color === c ? '2px solid #2a1f14' : '1px solid #d8cfc4',
            }} />
          ))}
        </div>
        <button onClick={clearCanvas} style={{ padding: '4px 12px', background: '#fdf0ef', border: '1px solid #f0b0a8', borderRadius: 20, color: '#b02020', fontSize: 12, cursor: 'pointer' }}>清空标注</button>
      </div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
        onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
        style={{ border: '1px solid #d8cfc4', borderRadius: 8, cursor: 'crosshair', width: '100%', maxWidth: 400 }}
      />
    </div>
  );
}

/** Annotated text with inline highlights */
export function AnnotatedText({ text, annotations }) {
  if (!annotations?.length || !text) {
    return <p style={{ margin: 0, fontSize: 14, lineHeight: 1.9, color: '#2a1f14', fontFamily: "'Georgia',serif", whiteSpace: 'pre-wrap' }}>{text}</p>;
  }
  const sorted = [...annotations].sort((a, b) => a.startIndex - b.startIndex).map((a, i) => ({ ...a, number: i + 1 }));
  const parts = [];
  let last = 0;
  sorted.forEach((anno, idx) => {
    if (anno.startIndex > last) parts.push(<span key={`t${idx}`}>{text.slice(last, anno.startIndex)}</span>);
    parts.push(
      <span key={`a${idx}`} style={{ backgroundColor: `${anno.color}20`, borderBottom: `2px wavy ${anno.color}`, padding: '0 4px', cursor: 'pointer', borderRadius: 2 }} title={`[${anno.number}] ${anno.issue} - ${anno.suggestion}`}>
        <sup style={{ color: '#fff', background: anno.color, borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, marginRight: 2, fontWeight: 'bold' }}>{anno.number}</sup>
        {text.slice(anno.startIndex, anno.endIndex)}
      </span>
    );
    last = anno.endIndex;
  });
  if (last < text.length) parts.push(<span key="end">{text.slice(last)}</span>);
  return <p style={{ margin: 0, fontSize: 14, lineHeight: 1.9, color: '#2a1f14', fontFamily: "'Georgia',serif", whiteSpace: 'pre-wrap' }}>{parts}</p>;
}
