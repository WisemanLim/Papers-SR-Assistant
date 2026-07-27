// localStorage-backed JSON fetch cache (NFR §5-1) — reduces shared rate-limit
// pressure on academic APIs. Errors are never cached; storage failures are
// swallowed so caching stays best-effort.
const PREFIX = "psra:cache:";
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export async function cachedFetchJson(url, { errorLabel = "API 오류", ttlMs = DEFAULT_TTL_MS } = {}) {
  const key = PREFIX + url;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const { t, data } = JSON.parse(raw);
      if (Date.now() - t < ttlMs) return data;
    }
  } catch {
    // corrupt/unavailable cache entry — fall through to network
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${errorLabel} (HTTP ${res.status})`);
  }
  const json = await res.json();
  try {
    localStorage.setItem(key, JSON.stringify({ t: Date.now(), data: json }));
  } catch {
    // quota exceeded etc. — skip caching
  }
  return json;
}
