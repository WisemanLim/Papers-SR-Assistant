// Workspace persistence (PRD Phase 1 "저장") — keeps externally added papers,
// citation-edge patches to the mock collection, cue sheet, seeds, memos, and
// sort mode across reloads. Defensive: corrupt data falls back to defaults.
import { mockPapers } from "../data/mockPapers";

const KEY = "psra:workspace:v1";

export function loadPersistedState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const state = JSON.parse(raw);
    return state && typeof state === "object" ? state : null;
  } catch {
    return null;
  }
}

// Rebuild the papers array: mock papers (+ persisted reference patches) + external papers
export function buildInitialPapers(state) {
  if (!state) return mockPapers;
  const patches = state.refPatches || {};
  const base = mockPapers.map((p) =>
    patches[p.id] && patches[p.id].length > 0
      ? { ...p, references: [...new Set([...p.references, ...patches[p.id]])] }
      : p
  );
  return base.concat(Array.isArray(state.externalPapers) ? state.externalPapers : []);
}

// Serializable diff vs the shipped mock collection: external papers +
// references added to mock papers beyond their defaults. Shared by
// persistence and share links.
export function snapshotWorkspace(papers) {
  const mockById = new Map(mockPapers.map((p) => [p.id, p]));
  const externalPapers = papers.filter((p) => p.isExternal);
  const refPatches = {};
  papers.forEach((p) => {
    const mock = mockById.get(p.id);
    if (!mock) return;
    const extra = (p.references || []).filter((id) => !mock.references.includes(id));
    if (extra.length > 0) refPatches[p.id] = extra;
  });
  return { externalPapers, refPatches };
}

export function persistState({ papers, cueSheetIds, seedPapers, memos, sortMode }) {
  try {
    const { externalPapers, refPatches } = snapshotWorkspace(papers);
    localStorage.setItem(
      KEY,
      JSON.stringify({ externalPapers, refPatches, cueSheetIds, seedPapers, memos, sortMode })
    );
  } catch {
    // quota exceeded etc. — persistence stays best-effort
  }
}

export function clearPersistedState() {
  try {
    localStorage.removeItem(KEY);
    // Drop cached API responses as well so a reset truly starts fresh
    Object.keys(localStorage)
      .filter((k) => k.startsWith("psra:cache:"))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
