import {
  callVolcengineAI,
  callVolcengineAIStream,
  classifyAIError,
  logJsonObservability,
  parseVolcengineStreamLine,
  readStreamChunk,
  recordAIFailure,
  recordAISuccess,
  tryRepairJsonText,
  withAIRetry,
} from './aiProviderService.js';
import { persistAuthoritativeGradingResult } from './aiService.js';
import { logError } from '../utils/logger.js';

function estimateMessageContentLength(content) {
  if (typeof content === 'string') return content.length;
  if (!Array.isArray(content)) return 0;

  return content.reduce((sum, item) => {
    if (item?.type === 'text') return sum + String(item.text || '').length;
    if (item?.type === 'image_url') return sum + 256;
    return sum;
  }, 0);
}

export function validateCompletionMessages(messages = []) {
  if (!messages.length) {
    return { valid: false, msg: 'messages 数组不能为空' };
  }

  const oversizedMessage = messages.find((message) => estimateMessageContentLength(message?.content) > 50000);
  if (oversizedMessage) {
    return { valid: false, msg: '单条消息内容过长，请精简后重试' };
  }

  return { valid: true };
}

export function validateCompletionUserContent(messages = []) {
  const userMsg = messages.find((message) => message.role === 'user');
  if (!userMsg) {
    return { valid: false, msg: '缺少用户内容' };
  }

  if (typeof userMsg.content === 'string') {
    return userMsg.content.trim()
      ? { valid: true }
      : { valid: false, msg: '反馈数据不能为空：文本内容为空' };
  }

  if (Array.isArray(userMsg.content)) {
    const hasValidText = userMsg.content.some((item) => item.type === 'text' && item.text?.trim());
    const hasValidImage = userMsg.content.some((item) => item.type === 'image_url' && item.image_url?.url?.trim());
    return hasValidText || hasValidImage
      ? { valid: true }
      : { valid: false, msg: '反馈数据不能为空：未传入有效文本/图片内容' };
  }

  return { valid: false, msg: `反馈数据不能为空：不支持的内容格式：${typeof userMsg.content}` };
}

async function persistCompletionResult({ user, persistWritingId, content, feedbackMeta, logLabel }) {
  if (!persistWritingId) {
    return { persisted: false };
  }

  try {
    return await persistAuthoritativeGradingResult({
      user,
      writingId: persistWritingId,
      rawContent: content,
      feedbackMeta,
    });
  } catch (persistError) {
    logError('ai_completion_persist_failed', {
      label: logLabel,
      writingId: persistWritingId,
      userId: user?.id,
      message: persistError.message,
    });
    return {
      persisted: false,
      error: persistError.message,
    };
  }
}

export async function executeCompletion({
  user,
  model,
  max_tokens,
  temperature,
  messages,
  persistWritingId,
  persistFeedbackMeta,
  extraParams = {},
}) {
  try {
    const content = await callVolcengineAI(model, messages, max_tokens, temperature, extraParams);
    await recordAISuccess('complete');

    const persistResult = await persistCompletionResult({
      user,
      persistWritingId,
      content,
      feedbackMeta: persistFeedbackMeta,
      logLabel: 'AI 非流式结果',
    });

    return {
      success: true,
      content,
      persisted: Boolean(persistResult.persisted),
      persistError: persistResult.error || null,
    };
  } catch (error) {
    const errorInfo = classifyAIError(error);
    void recordAIFailure(error, 'complete');
    throw {
      status: error.status && error.status < 500 ? error.status : errorInfo.status,
      message: error.message,
      errorCode: error.status && error.status < 500 ? null : errorInfo.code,
    };
  }
}

// Returns true if the stream is finished (client should stop reading), throws on error.
function _processStreamLine(line, chunks, onChunk) {
  if (!line || line === 'data: [DONE]') return false;
  const streamData = parseVolcengineStreamLine(line);
  if (!streamData) return false;
  if (streamData.error) throw new Error(streamData.error);
  if (streamData.content && streamData.content.trim()) {
    chunks.push(streamData.content);
    onChunk?.({ chunk: streamData.content, complete: { content: chunks.join('') }, done: streamData.finish });
  }
  return Boolean(streamData.finish);
}

function _buildStreamResult(repairedContent, finalContent, persistResult) {
  return {
    chunk: '',
    complete: { content: repairedContent || finalContent },
    done: true,
    repaired: Boolean(repairedContent && repairedContent !== finalContent),
    persisted: Boolean(persistResult.persisted),
    persistError: persistResult.error || null,
  };
}

function _buildStreamErrorPayload(error, errorInfo) {
  return {
    status: error.status && error.status < 500 ? error.status : errorInfo.status,
    message: error.message,
    errorCode: error.status && error.status < 500 ? null : errorInfo.code,
  };
}

export async function executeStreamingCompletion({
  user,
  model,
  max_tokens,
  temperature,
  messages,
  persistWritingId,
  persistFeedbackMeta,
  onChunk,
  onRequestClose,
}) {
  try {
    const aiRes = await withAIRetry(
      () => callVolcengineAIStream(model, messages, max_tokens, temperature),
      { retries: 1, label: 'AI 流式建连' }
    );

    const reader = aiRes.body.getReader();
    const decoder = new TextDecoder('utf-8');
    const chunks = [];
    let buffer = '';
    let clientDisconnected = false;

    onRequestClose?.(() => {
      clientDisconnected = true;
      reader.cancel();
    });

    while (true) {
      const { done, value } = await readStreamChunk(reader);
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const rawLine of lines) {
        if (_processStreamLine(rawLine.trim(), chunks, onChunk)) { reader.cancel(); break; }
      }
    }

    // If the client closed the connection mid-stream, do not persist partial
    // content — it would write malformed JSON to the DB.
    if (clientDisconnected) {
      return { done: true, cancelled: true, persisted: false };
    }

    // Process any remaining buffered data after the loop ends
    _processStreamLine(buffer.trim(), chunks, onChunk);

    const finalContent = chunks.join('');
    if (!finalContent.trim()) throw new Error('AI 流式返回为空');

    const repairedContent = tryRepairJsonText(finalContent);
    logJsonObservability('AI流式返回摘要', finalContent, repairedContent);
    await recordAISuccess('complete_stream');

    const persistResult = await persistCompletionResult({
      user,
      persistWritingId,
      content: repairedContent || finalContent,
      feedbackMeta: persistFeedbackMeta,
      logLabel: 'AI 流式结果',
    });

    return _buildStreamResult(repairedContent, finalContent, persistResult);
  } catch (error) {
    const errorInfo = classifyAIError(error);
    void recordAIFailure(error, 'complete_stream');
    throw _buildStreamErrorPayload(error, errorInfo);
  }
}
