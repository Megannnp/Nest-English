const STORAGE_KEY = 'nestProfileOnboarding';

export function persistProfileOnboarding(returnTarget = '') {
  try {
    const returnRoute = typeof returnTarget === 'object' && returnTarget !== null ? returnTarget : null;
    const returnPage = returnRoute?.page || returnTarget || '';
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      active: true,
      returnPage,
      ...(returnRoute ? { returnRoute } : {}),
    }));
  } catch {
    // ignore storage failures in private browsing
  }
}

export function readProfileOnboarding() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.active ? parsed : null;
  } catch {
    return null;
  }
}

export function clearProfileOnboarding() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
