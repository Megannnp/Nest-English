import { useMemo } from "react";

function sameId(left, right) {
  return String(left) === String(right);
}

export function useTeacherWritingSequence(writingContext, writingId) {
  return useMemo(() => {
    const writingSequence = Array.isArray(writingContext?.sequence) ? writingContext.sequence : [];
    const currentSequenceIndex = writingSequence.findIndex((item) => sameId(item?.writingId, writingId));
    const previousWriting = currentSequenceIndex > 0 ? writingSequence[currentSequenceIndex - 1] : null;
    const nextWriting = currentSequenceIndex >= 0 && currentSequenceIndex < writingSequence.length - 1
      ? writingSequence[currentSequenceIndex + 1]
      : null;
    const progressTotal = writingSequence.length;
    const progressCurrent = currentSequenceIndex >= 0 ? currentSequenceIndex + 1 : 0;
    const progressPercent = progressTotal > 0 ? Math.round((progressCurrent / progressTotal) * 100) : 0;

    return {
      writingSequence,
      currentSequenceIndex,
      previousWriting,
      nextWriting,
      progressTotal,
      progressCurrent,
      progressPercent,
    };
  }, [writingContext?.sequence, writingId]);
}
