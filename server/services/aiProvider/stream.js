function _extractChoiceContent(choice) {
  return choice.delta?.content || choice.message?.content || '';
}

function _parseOpenAIChoices(data) {
  if (!Array.isArray(data.choices) || !data.choices.length) return null;
  const choice = data.choices[0];
  return { content: _extractChoiceContent(choice), finish: choice.finish_reason === 'stop' };
}

function _parseVolcPayload(data) {
  const choices = data.payload?.choices;
  if (data.header?.code !== 0 || !Array.isArray(choices) || !choices.length) return null;
  const choice = choices[0];
  return { content: _extractChoiceContent(choice), finish: choice.finish_reason === 'stop' };
}

function _parseVolcError(data) {
  if (typeof data.header?.code !== 'number' || data.header.code === 0) return null;
  return { error: `${data.header?.message || '火山引擎API错误'} (错误码：${data.header.code})` };
}

function getVolcengineConfig() {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
  const defaultModel = process.env.AI_DEFAULT_MODEL;
  if (!apiKey) throw new Error('未配置 AI_API_KEY');
  if (!defaultModel) throw new Error('未配置 AI_DEFAULT_MODEL');
  return { apiKey, baseUrl, defaultModel };
}

function getHttpErrorHint(status) {
  if (status === 401) return '（API密钥错误/过期）';
  if (status === 404) return '（模型ID不存在）';
  if (status === 429) return '（请求频率超限）';
  return '';
}

async function assertVolcengineResponseOk(res) {
  if (res.ok) return;

  const errBody = await res.text().catch(() => '');
  const hint = getHttpErrorHint(res.status);
  const httpErr = new Error(`火山引擎请求失败 [${res.status}]${hint}：${errBody.slice(0, 200)}`);
  httpErr.statusCode = res.status;
  throw httpErr;
}

export function parseVolcengineStreamLine(line) {
  if (!line || !line.startsWith('data: ')) return null;
  if (line.trim() === 'data: [DONE]') return null;
  try {
    const data = JSON.parse(line.slice(6));
    return _parseOpenAIChoices(data) || _parseVolcPayload(data) || _parseVolcError(data);
  } catch {
    return null;
  }
}

export async function callVolcengineAIStream(model, messages, maxTokens, temperature, extraParams = {}) {
  const { apiKey, baseUrl, defaultModel } = getVolcengineConfig();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  const requestBody = {
    model: model || defaultModel,
    messages,
    stream: true,
    max_tokens: maxTokens || 12288,
    temperature: temperature ?? 0.1,
    top_p: 0.9,
    stream_options: { include_usage: false },
    ...extraParams,
  };

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    await assertVolcengineResponseOk(res);
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * True non-streaming call — uses stream:false so the model cannot emit unquoted
 * string values mid-token. Preferred when response_format json_object is needed.
 */
export async function callVolcengineAINonStream(model, messages, maxTokens, temperature, extraParams = {}) {
  const { apiKey, baseUrl, defaultModel } = getVolcengineConfig();

  // Strip internal flags before sending to the API
  const { _nonStream: _removed, ...cleanParams } = extraParams;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);

  const requestBody = {
    model: model || defaultModel,
    messages,
    stream: false,
    max_tokens: maxTokens || 12288,
    temperature: temperature ?? 0.1,
    top_p: 0.9,
    ...cleanParams,
  };

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    await assertVolcengineResponseOk(res);

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || '';
    if (!content.trim()) throw new Error('AI 返回为空');
    return content;
  } finally {
    clearTimeout(timeout);
  }
}

export async function readStreamChunk(reader, timeoutMs = 30000) {
  let timer = null;
  try {
    return await Promise.race([
      reader.read(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`AI 流读取超时（${timeoutMs}ms）`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Reads a Volcengine SSE stream response to completion and returns the
 * concatenated content text. Shared by every caller of callVolcengineAIStream
 * so the chunk-buffering/line-parsing logic lives in exactly one place.
 */
export async function collectVolcengineStreamText(aiRes) {
  const reader = aiRes.body.getReader();
  const decoder = new TextDecoder('utf-8');
  const chunks = [];
  let buffer = '';

  while (true) {
    const { done, value } = await readStreamChunk(reader);
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const data = parseVolcengineStreamLine(line.trim());
      if (data?.content) chunks.push(data.content);
    }
  }
  if (buffer.trim()) {
    const data = parseVolcengineStreamLine(buffer.trim());
    if (data?.content) chunks.push(data.content);
  }

  return chunks.join('');
}
