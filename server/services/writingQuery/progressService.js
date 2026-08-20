import db from '../../db/database.js';
import { getWritingStructureProgress } from '../writingStructureProgressService.js';

/**
 * Returns aggregated writing progress statistics for a user.
 *
 * - totalWritings:        all submitted writings
 * - writingsWithFeedback: writings where AI feedback produced a numeric totalScore
 * - averageScore:         mean totalScore across those writings (1 dp), or 0 if none
 */
export async function getWritingProgressStats(userId) {
  const [row, structureProgress] = await Promise.all([
    db.prepare(`
    SELECT
      COUNT(*) AS total_writings,
      SUM(
        CASE
          WHEN JSON_EXTRACT(feedback, '$.totalScore') IS NOT NULL
           AND JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.totalScore')) REGEXP '^[0-9]+(\\.[0-9]+)?$'
          THEN 1
          ELSE 0
        END
      ) AS writings_with_feedback,
      ROUND(
        AVG(
          CASE
            WHEN JSON_EXTRACT(feedback, '$.totalScore') IS NOT NULL
             AND JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.totalScore')) REGEXP '^[0-9]+(\\.[0-9]+)?$'
            THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(feedback, '$.totalScore')) AS DECIMAL(5,2))
            ELSE NULL
          END
        ), 1
      ) AS avg_score
    FROM writings
    WHERE user_id = ?
  `).get(userId),
    getWritingStructureProgress(userId),
  ]);

  return {
    totalWritings:        Number(row?.total_writings || 0),
    writingsWithFeedback: Number(row?.writings_with_feedback || 0),
    averageScore:         Number(row?.avg_score || 0),
    structureProgress,
  };
}
