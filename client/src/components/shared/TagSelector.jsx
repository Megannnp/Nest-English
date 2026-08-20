import { useState } from "react";

export function TagSelector({
  label,
  labelZh,
  tags,
  setTags,
  selected,
  setSelected,
  single = false,
}) {
  const [val, setVal] = useState("");
  const [show, setShow] = useState(false);

  const toggle = (tag) =>
    single
      ? setSelected(selected === tag ? "" : tag)
      : setSelected(
          selected.includes(tag)
            ? selected.filter((item) => item !== tag)
            : [...selected, tag]
        );

  const add = () => {
    const nextValue = val.trim();
    if (nextValue && !tags.includes(nextValue)) {
      setTags([...tags, nextValue]);
      if (single) setSelected(nextValue);
      else setSelected([...selected, nextValue]);
    }
    setVal("");
    setShow(false);
  };

  const isSelected = (tag) => (single ? selected === tag : selected.includes(tag));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span
          style={{
            fontSize: 11,
            color: "#7c5c2e",
            letterSpacing: 2,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          {label}
        </span>
        {labelZh ? <span style={{ fontSize: 11, color: "#a09080" }}>{labelZh}</span> : null}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center" }}>
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            style={{
              padding: "4px 13px",
              borderRadius: 20,
              fontSize: 13,
              border: isSelected(tag) ? "1.5px solid #c8852a" : "1px solid #d8cfc4",
              background: isSelected(tag) ? "#fdf0d8" : "#faf8f5",
              color: isSelected(tag) ? "#8b5e1a" : "#8a7d6e",
              cursor: "pointer",
            }}
          >
            {tag}
          </button>
        ))}

        {show ? (
          <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
            <input
              autoFocus
              aria-label="添加标签"
              value={val}
              onChange={(event) => setVal(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") add();
                if (event.key === "Escape") setShow(false);
              }}
              placeholder="Enter后添加"
              style={{
                background: "#faf8f5",
                border: "1px solid #c8852a",
                borderRadius: 20,
                padding: "4px 11px",
                color: "#3a2a18",
                fontSize: 13,
                outline: "none",
                width: 110,
              }}
            />
            <button
              type="button"
              onClick={add}
              style={{
                background: "#fdf0d8",
                border: "1px solid #c8852a",
                borderRadius: 20,
                color: "#8b5e1a",
                padding: "4px 9px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              ✓
            </button>
            <button
              type="button"
              onClick={() => setShow(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#a09080",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShow(true)}
            style={{
              padding: "4px 11px",
              borderRadius: 20,
              fontSize: 12,
              border: "1px dashed #c8a87a",
              background: "transparent",
              color: "#a09080",
              cursor: "pointer",
            }}
          >
            + 自定义
          </button>
        )}
      </div>
    </div>
  );
}
