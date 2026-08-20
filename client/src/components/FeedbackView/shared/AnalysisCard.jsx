import { useState } from 'react';

import useIsMobile from '../../../hooks/useIsMobile.js';

export default function AnalysisCard({
  title,
  _icon,
  _gradient,
  _borderColor,
  children,
  defaultExpanded = true,
  expandable = false,
  onToggle,
  isExpanded: controlledExpanded
}) {
  const isMobile = useIsMobile();
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const canToggle = Boolean(expandable || onToggle);

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else if (expandable) {
      setInternalExpanded(!internalExpanded);
    }
  };

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 0,
      border: '1px solid #e8e0d5',
      overflow: 'hidden',
      marginBottom: isMobile ? 12 : 16,
    }}>
      <button
        type="button"
        aria-label={canToggle ? `${isExpanded ? '收起' : '展开'}${title}` : title}
        disabled={!canToggle}
        onClick={canToggle ? handleToggle : undefined}
        style={{
          width: '100%',
          border: 0,
          padding: isMobile ? '9px 12px' : '9px 14px',
          background: '#f5f0e8',
          borderBottom: '1px solid #d4c8b8',
          cursor: canToggle ? 'pointer' : 'default',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#6b5a47', letterSpacing: '0.03em' }}>
            {title}
          </span>
        </div>
        {canToggle && (
          <span style={{
            transform: isExpanded ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s',
            fontSize: 10,
            color: '#8a7d6e',
          }}>▼</span>
        )}
      </button>

      {isExpanded && (
        <div style={{ padding: isMobile ? 12 : 16 }}>{children}</div>
      )}
    </div>
  );
}
