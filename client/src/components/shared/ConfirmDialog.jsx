/**
 * Lightweight non-blocking confirm dialog.
 *
 * Props:
 *  state   – confirmState from useConfirmDialog() (null = hidden)
 *  onRespond – respondConfirm from useConfirmDialog()
 *  confirmLabel – defaults to "确认"
 *  cancelLabel  – defaults to "取消"
 */
import useBodyScrollLock from "../../hooks/useBodyScrollLock.js";

export default function ConfirmDialog({ state, onRespond, confirmLabel = '确认', cancelLabel = '取消' }) {
  useBodyScrollLock(!!state);
  if (!state) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9000,
        background: 'rgba(0,0,0,0.35)',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: '24px 28px',
          maxWidth: 420,
          width: '100%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 15,
            color: '#2a1f14',
            lineHeight: 1.65,
            whiteSpace: 'pre-wrap',
          }}
        >
          {state.message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button
            onClick={() => onRespond(false)}
            style={{
              padding: '8px 20px',
              borderRadius: 22,
              border: '1px solid #e0d8cc',
              background: '#faf8f5',
              color: '#8a7d6e',
              fontSize: 14,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => onRespond(true)}
            style={{
              padding: '8px 20px',
              borderRadius: 22,
              border: 'none',
              background: '#c84040',
              color: '#fff',
              fontSize: 14,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
