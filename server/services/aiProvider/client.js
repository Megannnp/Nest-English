import { ensureAICircuitAvailable, recordAISuccess } from './circuitBreaker.js';
import { logJsonObservability } from './jsonObservability.js';
import { recordAIOperation } from './metrics.js';
import { withAIRetry } from './retry.js';
import { callVolcengineAIStream, callVolcengineAINonStream, parseVolcengineStreamLine, readStreamChunk } from './stream.js';
import { tryRepairJsonText } from '../ai/json.js';

export async function callVolcengineAI(model, messages, maxTokens, temperature, extraParams = {}) {
  const startedAt = Date.now();
  await ensureAICircuitAvailable();

  // When _nonStream flag is set, use a true non-streaming call.
  // This is necessary when response_format:json_object is used because some
  // models (e.g. Volcengine Doubao) can still emit unquoted JSON string values
  // in streaming mode, making the response unparseable.
  if (extraParams._nonStream) {
    try {
      return await withAIRetry(async () => {
        const content = await callVolcengineAINonStream(model, messages, maxTokens, temperature, extraParams);
        const repaired = tryRepairJsonText(content);
        logJsonObservability('AI非流式(强制)返回摘要', content, repaired);
        await recordAISuccess();
        recordAIOperation('general', 'success', Date.now() - startedAt);
        return repaired || content;
      }, { retries: 1, label: 'AI 非流式请求(强制)' });
    } catch (error) {
      recordAIOperation('general', 'failure', Date.now() - startedAt);
      throw error;
    }
  }

  try {
    return await withAIRetry(async () => {
      const aiRes = await callVolcengineAIStream(model, messages, maxTokens, temperature, extraParams);
      const reader = aiRes.body.getReader();
      const decoder = new TextDecoder('utf-8');
      const chunks = [];
      try {
        while (true) {
          const { done, value } = await readStreamChunk(reader);
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          for (const line of text.split('\n')) {
            const streamData = parseVolcengineStreamLine(line);
            if (streamData?.error) throw new Error(streamData.error);
            if (streamData?.content) chunks.push(streamData.content);
          }
        }
      } finally {
        reader.cancel().catch(() => {});
      }

      const content = chunks.join('');
      if (!content.trim()) {
        throw new Error('AI 返回为空');
      }

      const repaired = tryRepairJsonText(content);
      logJsonObservability('AI非流式返回摘要', content, repaired);
      await recordAISuccess();
      recordAIOperation('general', 'success', Date.now() - startedAt);
      return repaired || content;
    }, { retries: 1, label: 'AI 非流式请求' });
  } catch (error) {
    recordAIOperation('general', 'failure', Date.now() - startedAt);
    throw error;
  }
}
