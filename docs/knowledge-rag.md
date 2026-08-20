# Knowledge RAG

NestEnglish now has a lightweight local Markdown RAG layer for teaching-content AI features.

## Services

Use `server/services/knowledgeRouterService.js` from product features. It routes by user, module, exam, task type, learning goal and content, then delegates retrieval to `server/services/knowledgeService.js`.

```js
import { buildRoutedKnowledgeContext } from '../knowledgeRouterService.js';

const context = buildRoutedKnowledgeContext({
  user,
  module: 'writing',
  exam: 'ielts',
  taskType: 'ielts_task2',
  learningGoal: 'IELTS 7.0 writing',
  title,
  promptText,
  content,
});
```

The router infers missing exam/module values from the learning goal, task type and text. The lower-level retrieval service scans Markdown files, splits them by headings, ranks chunks with simple keyword scoring, and returns a prompt-ready reference block with source labels.

IELTS writing uses a thin wrapper: `server/services/ieltsKnowledgeService.js`. New exams should follow the same pattern only when they need exam-specific defaults.

## Routing Contract

The platform should stay one product surface. Knowledge changes behind it.

```text
user + role + learningGoal + module + exam + taskType + content
→ knowledgeRouterService
→ knowledgeService
→ prompt-ready reference block
→ AI feature prompt
```

Examples:

```js
buildRoutedKnowledgeContext({
  user,
  module: 'reading',
  exam: 'sat',
  taskType: 'evidence_question',
  learningGoal: 'SAT Reading 700+',
  promptText,
  content: passage,
});

buildRoutedKnowledgeContext({
  user,
  module: 'vocabulary',
  exam: 'gre',
  taskType: 'synonym_expansion',
  learningGoal: 'GRE Verbal',
  content: word,
});
```

## Config

Set one or more local knowledge roots:

```bash
NEST_KNOWLEDGE_DIRS=/path/to/ielts:/path/to/grammar:/path/to/reading
```

If `NEST_KNOWLEDGE_DIRS` is not set, the service falls back to `IELTS_KNOWLEDGE_DIR`, then `/Users/jiqiguanjia/Documents/雅思数据库`.

## When To Use

Use this for content AI:

- writing feedback
- reading analysis
- grammar explanation
- vocabulary expansion
- speaking answer coaching
- listening strategy explanation

Do not use it for business workflows such as login, payments, class membership, assignment status, or analytics.

## Upgrade Path

Keep this local Markdown layer until the knowledge base grows large enough to need embedding search. Then keep the same `buildKnowledgeContext` call shape and swap the internals to pgvector or another vector store.

## Adding A New Exam

1. Add a Markdown knowledge root, for example `/data/nest-knowledge/sat`.
2. Add that path to `NEST_KNOWLEDGE_DIRS`.
3. Make files self-describing with headings that include module, exam, task type and core terms.
4. If generic routing is enough, no code change is needed.
5. If the exam needs special boosts or task aliases, add a thin wrapper like `ieltsKnowledgeService.js` or extend `knowledgeRouterService.js`.
