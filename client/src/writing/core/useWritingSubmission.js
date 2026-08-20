import { useEffect, useRef } from 'react';

import { createSubmissionActions } from './submissionActions.js';

export function useWritingSubmission({
  state,
  ...options
}) {
  const controllerRef = useRef(null);

  // Abort any in-flight supplemental polling when the writing page unmounts
  useEffect(() => {
    return () => { controllerRef.current?.abort(); };
  }, []);

  return createSubmissionActions({
    ...options,
    getState: () => state,
    getAbortController: () => controllerRef.current,
    setAbortController: (c) => { controllerRef.current = c; },
  });
}
