import { createValidationError } from './routeValidation.js';

function parseWithSchema(schema, value, path) {
  return schema.parse(value, path);
}

function _checkStringConstraints(normalized, { required, min, allowedValues, pattern, message, defaultValue, path }) {
  if (required && normalized.length < min) throw createValidationError(message || `${path} 不合法`);
  if (!required && !normalized) return defaultValue ?? '';
  if (normalized.length < min) throw createValidationError(message || `${path} 不合法`);
  if (allowedValues && !allowedValues.includes(normalized)) throw createValidationError(message || `${path} 不合法`);
  if (pattern && !pattern.test(normalized)) throw createValidationError(message || `${path} 格式不正确`);
  return normalized;
}

export function string(options = {}) {
  const {
    required = false,
    trim = true,
    min = 0,
    max = Infinity,
    enum: allowedValues = null,
    pattern = null,
    message = null,
    defaultValue = undefined,
  } = options;

  return {
    parse(value, path = 'value') {
      if (value == null || value === '') {
        if (required) throw createValidationError(message || `${path} 不能为空`);
        return defaultValue ?? '';
      }
      if (typeof value !== 'string') {
        throw createValidationError(`${path} 必须是字符串`);
      }
      const normalized = (trim ? value.trim() : value).slice(0, max);
      return _checkStringConstraints(normalized, { required, min, allowedValues, pattern, message, defaultValue, path });
    },
  };
}

export function number(options = {}) {
  const {
    required = false,
    integer = false,
    min = -Infinity,
    max = Infinity,
    message = null,
    defaultValue = undefined,
  } = options;

  return {
    parse(value, path = 'value') {
      if (value == null || value === '') {
        if (required) throw createValidationError(message || `${path} 不能为空`);
        return defaultValue ?? null;
      }

      const normalized = Number(value);
      if (!Number.isFinite(normalized)) {
        throw createValidationError(message || `${path} 必须是数字`);
      }
      if (integer && !Number.isInteger(normalized)) {
        throw createValidationError(message || `${path} 必须是整数`);
      }
      if (normalized < min || normalized > max) {
        throw createValidationError(message || `${path} 超出允许范围`);
      }
      return normalized;
    },
  };
}

export function boolean(options = {}) {
  const {
    defaultValue = false,
  } = options;

  return {
    parse(value) {
      if (value == null) return defaultValue;
      if (typeof value === 'boolean') return value;
      if (value === 'true' || value === '1') return true;
      if (value === 'false' || value === '0') return false;
      return Boolean(value);
    },
  };
}

export function array(itemSchema, options = {}) {
  const {
    defaultValue = [],
    maxItems = Infinity,
  } = options;

  return {
    parse(value, path = 'value') {
      if (value == null) return [...defaultValue];
      if (!Array.isArray(value)) {
        throw createValidationError(`${path} 必须是数组`);
      }
      return value.slice(0, maxItems).map((item, index) => parseWithSchema(itemSchema, item, `${path}[${index}]`));
    },
  };
}

export function object(shape, options = {}) {
  const {
    defaultValue = undefined,
    allowUnknown = false,
  } = options;

  return {
    parse(value, path = 'value') {
      if (value == null) {
        if (defaultValue !== undefined) return structuredClone(defaultValue);
        throw createValidationError(`${path} 不能为空`);
      }
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw createValidationError(`${path} 必须是对象`);
      }

      const result = {};
      for (const [key, schema] of Object.entries(shape)) {
        result[key] = parseWithSchema(schema, value[key], `${path}.${key}`);
      }

      if (allowUnknown) {
        for (const [key, item] of Object.entries(value)) {
          if (!(key in shape)) result[key] = item;
        }
      }

      return result;
    },
  };
}

export function partialObject(shape, options = {}) {
  const {
    allowUnknown = false,
  } = options;

  return {
    parse(value, path = 'value') {
      if (value == null) {
        return {};
      }
      if (typeof value !== 'object' || Array.isArray(value)) {
        throw createValidationError(`${path} 必须是对象`);
      }

      const result = {};
      for (const [key, schema] of Object.entries(shape)) {
        if (Object.prototype.hasOwnProperty.call(value, key)) {
          result[key] = parseWithSchema(schema, value[key], `${path}.${key}`);
        }
      }

      if (allowUnknown) {
        for (const [key, item] of Object.entries(value)) {
          if (!(key in shape)) result[key] = item;
        }
      }

      return result;
    },
  };
}

export function passthrough(options = {}) {
  return {
    parse(value) {
      if (value == null) return options.defaultValue ?? null;
      return value;
    },
  };
}

/**
 * Wraps any schema to additionally accept null / undefined, returning null
 * in those cases instead of delegating to the inner schema.
 */
export function nullable(schema) {
  return {
    parse(value, path = 'value') {
      if (value === null || value === undefined) return null;
      return schema.parse(value, path);
    },
  };
}
