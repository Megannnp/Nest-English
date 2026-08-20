import useIsMobile from '../../../hooks/useIsMobile.js';

export default function BilingualDisplay({ originalText, translation, highlightRanges: _highlightRanges = [] }) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
      gap: isMobile ? 10 : 16,
      background: '#f5f0e8',
      padding: isMobile ? 12 : 16,
      borderRadius: 0,
      border: '1px solid #d4c8b8',
    }}>
      <div>
        <div style={{
          display: 'inline-block',
          padding: '2px 8px',
          background: '#6b5a47',
          color: '#fff',
          borderRadius: 2,
          fontSize: 11,
          fontWeight: 700,
          marginBottom: 8,
        }}>
          原文精读
        </div>
        <div style={{
          fontSize: 13,
          lineHeight: 1.8,
          fontFamily: 'Georgia, "Times New Roman", serif',
          color: '#2a1f14',
          whiteSpace: 'pre-wrap',
          background: '#ffffff',
          border: '1px solid #e8e0d5',
          borderRadius: 0,
          padding: isMobile ? 12 : 14,
        }}>
          {originalText || '未提供原文'}
        </div>
      </div>
      <div>
        <div style={{
          display: 'inline-block',
          padding: '2px 8px',
          background: '#3a6a45',
          color: '#fff',
          borderRadius: 2,
          fontSize: 11,
          fontWeight: 700,
          marginBottom: 8,
        }}>
          中文理解
        </div>
        <div style={{
          fontSize: 13,
          lineHeight: 1.8,
          background: '#f5f0e8',
          padding: isMobile ? 12 : 14,
          borderRadius: 0,
          border: '1px solid #d4c8b8',
          color: '#4a3928',
          whiteSpace: 'pre-wrap',
        }}>
          {translation || '未提供翻译'}
        </div>
      </div>
    </div>
  );
}
