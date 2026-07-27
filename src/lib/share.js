// Cue sheet share links (PRD Phase 3) — serverless: the whole shareable
// workspace is encoded into the URL hash (#share=...), no backend required.
// Unicode-safe base64 round-trip; corrupt payloads decode to null.

const VERSION = 1;

function toBase64(json) {
  return btoa(unescape(encodeURIComponent(json)));
}

function fromBase64(b64) {
  return decodeURIComponent(escape(atob(b64)));
}

// state: { cueSheetIds, seedPapers, sortMode, memos, externalPapers, refPatches }
export function encodeShareUrl(state, baseUrl) {
  const payload = { v: VERSION, ...state };
  const hash = toBase64(JSON.stringify(payload));
  const base = baseUrl || `${window.location.origin}${window.location.pathname}`;
  return `${base}#share=${hash}`;
}

// Returns the decoded share state or null (absent/corrupt/unknown version)
export function decodeShareHash(hashString) {
  const match = /#share=([A-Za-z0-9+/=]+)/.exec(hashString || "");
  if (!match) return null;
  try {
    const payload = JSON.parse(fromBase64(match[1]));
    if (!payload || payload.v !== VERSION || !Array.isArray(payload.cueSheetIds)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function clearShareHash() {
  try {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  } catch {
    // history API unavailable — hash stays, harmless
  }
}
