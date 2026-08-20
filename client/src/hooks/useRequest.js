import { useState, useCallback } from 'react';

import { apiCall } from '../api/client';

/**
 * 通用请求 Hook
 * @param {String} url 请求地址
 * @param {String} method 请求方法
 * @returns {Object} { data, loading, error, sendRequest }
 */
export const useRequest = (url, method = 'POST') => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendRequest = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiCall(url, {
        method,
        body: method === 'GET' ? undefined : JSON.stringify(params),
      });
      setData(res);
      return res;
    } catch (err) {
      setError(err.message || '请求失败');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [url, method]);

  return { data, loading, error, sendRequest };
};
