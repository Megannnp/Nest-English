import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/dom';

configure({ asyncUtilTimeout: 5000 });

// Node 22+ 在 jsdom 环境下不再自动暴露 localStorage / sessionStorage
// （会打印 `--localstorage-file` 实验性警告且 window.localStorage 为 undefined）。
// 这里用内存实现 polyfill，保证所有使用 storage 的测试（路由恢复、备考偏好等）
// 在 CI / 本地一致可用。每个测试由测试文件自行 clear。
function createMemoryStorage() {
  let store = Object.create(null);
  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      store = Object.create(null);
    },
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    key(index) {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key) {
      delete store[key];
    },
    setItem(key, value) {
      store[key] = String(value);
    },
  };
}

if (typeof window !== 'undefined') {
  if (!window.localStorage) {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: createMemoryStorage(),
    });
  }
  if (!window.sessionStorage) {
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: createMemoryStorage(),
    });
  }
}