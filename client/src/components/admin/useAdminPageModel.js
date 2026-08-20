import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchAdminDashboard,
} from '../../api/admin.js';

const VALID_TABS = [
  'dashboard', 'users', 'payments', 'audio', 'rankings',
  'budget', 'integrations', 'logs', 'settings',
];

function readTabFromHash() {
  if (typeof window === 'undefined') return 'dashboard';
  const value = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('tab');
  return value && VALID_TABS.includes(value) ? value : 'dashboard';
}

function writeTabToHash(tab) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  params.set('tab', tab);
  window.history.replaceState(null, '', `#${params.toString()}`);
}

export default function useAdminPageModel() {
  const [tab, setTabState] = useState(readTabFromHash);
  const [dashboard, setDashboard] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [includeTestData, setIncludeTestData] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetchAdminDashboard({ includeTestData });
      setDashboard(res);
    } catch {
      setDashboard(null);
    } finally {
      setStatsLoading(false);
    }
  }, [includeTestData]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await loadDashboard();
    setLoading(false);
  }, [loadDashboard]);

  const loadAllRef = useRef(loadAll);
  loadAllRef.current = loadAll;
  useEffect(() => { void loadAllRef.current(); }, []);

  const setTab = useCallback((next) => {
    setTabState(next);
    writeTabToHash(next);
  }, []);

  useEffect(() => {
    function onHashChange() {
      setTabState(readTabFromHash());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // Sync initial hash if tab was read from it
  useEffect(() => { writeTabToHash(tab); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch dashboard whenever the includeTestData toggle changes.
  const isDashboardFirstRun = useRef(true);
  useEffect(() => {
    if (isDashboardFirstRun.current) {
      isDashboardFirstRun.current = false;
      return;
    }
    void loadDashboard();
  }, [loadDashboard]);

  return {
    state: {
      tab,
      dashboard,
      statsLoading,
      includeTestData,
      loading,
    },
    actions: {
      setTab,
      setIncludeTestData,
      loadDashboard,
    },
  };
}
