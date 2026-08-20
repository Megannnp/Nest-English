import { optionalTrimmedString } from '../../utils/routeValidation.js';

function clampInteger(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  const int = Math.trunc(num);
  return Math.min(max, Math.max(min, int));
}

function clampFloat(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

// Returns a validated model ID from the client request, or null to use the server default.
// Allowed models are configured via AI_ALLOWED_MODELS (comma-separated).
// If the env var is unset or empty, client model overrides are disabled entirely.
function resolveAllowedModel(requested) {
  const allowedRaw = process.env.AI_ALLOWED_MODELS || '';
  const allowed = allowedRaw
    .split(',')
    .map((m) => m.trim())
    .filter(Boolean);
  if (allowed.length === 0) return null;
  const candidate = String(requested || '').trim();
  return allowed.includes(candidate) ? candidate : null;
}

function trimMessages(messages, limit = 12) {
  if (messages.length <= limit) return messages;
  const hasSystemLead = messages[0]?.role === 'system';
  return hasSystemLead
    ? [messages[0], ...messages.slice(-(limit - 1))]
    : messages.slice(-limit);
}

export function normalizeAIRequestPayload(body = {}) {
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const trimmedMessages = trimMessages(messages);

  return {
    model: resolveAllowedModel(body.model),
    max_tokens: clampInteger(body.max_tokens, 128, 8192, 2048),
    temperature: clampFloat(body.temperature, 0, 1.2, 0.2),
    messages: trimmedMessages,
    persistWritingId: optionalTrimmedString(body.persistWritingId, 64),
    persistMode: optionalTrimmedString(body.persistMode, 24) || 'grading',
    persistFeedbackMeta: body.persistFeedbackMeta && typeof body.persistFeedbackMeta === 'object'
      ? body.persistFeedbackMeta
      : null,
  };
}
