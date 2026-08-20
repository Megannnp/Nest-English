import { useEffect, useState } from "react";

import { READING_CATEGORIES, WRITING_CATEGORIES, READING_SYNONYMS, WRITING_SYNONYMS } from "./vocabContent.js";
import { VOCAB_COURSE_TREE } from "./vocabCourseContent.js";
import { vocabularyAPI } from "../api/index.js";

const STATIC_FALLBACK = {
  readingCategories: READING_CATEGORIES,
  writingCategories: WRITING_CATEGORIES,
  readingSynonyms: READING_SYNONYMS,
  writingSynonyms: WRITING_SYNONYMS,
  courseTree: VOCAB_COURSE_TREE,
};

/**
 * Loads the (possibly admin-edited) vocab word bank / course tree from the
 * server. Starts from the bundled static content so pages render instantly
 * with no loading flash, then swaps in live data once fetched. Falls back
 * silently to the static content if the request fails.
 */
export default function useVocabContent({ systemId = "" } = {}) {
  const [content, setContent] = useState(STATIC_FALLBACK);

  useEffect(() => {
    let cancelled = false;
    vocabularyAPI.content({ systemId })
      .then((data) => {
        if (!cancelled && data) setContent(data);
      })
      .catch(() => {
        // Keep the static fallback already in state.
      });
    return () => { cancelled = true; };
  }, [systemId]);

  return content;
}
