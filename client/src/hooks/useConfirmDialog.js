import { useCallback, useRef, useState } from 'react';

/**
 * Promise-based non-blocking confirm dialog.
 *
 * Usage in a hook/model that needs user confirmation:
 *   const proceed = await requestConfirm("确认删除？");
 *   if (!proceed) return;
 *
 * Usage in the owning component:
 *   const { confirmState, requestConfirm, respondConfirm } = useConfirmDialog();
 *   // pass requestConfirm to the model
 *   // render: <ConfirmDialog state={confirmState} onRespond={respondConfirm} />
 */
export function useConfirmDialog() {
  const [confirmState, setConfirmState] = useState(null); // null | { message: string }
  const resolveRef = useRef(null);

  const requestConfirm = useCallback((message) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setConfirmState({ message });
    });
  }, []);

  const respondConfirm = useCallback((result) => {
    resolveRef.current?.(Boolean(result));
    resolveRef.current = null;
    setConfirmState(null);
  }, []);

  return { confirmState, requestConfirm, respondConfirm };
}
