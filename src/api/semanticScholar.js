// Semantic Scholar Graph API client (no API key — public shared rate limit)
// https://api.semanticscholar.org/api-docs/graph
// Calls go through the Vite dev/preview proxy (/s2api) to avoid CORS issues:
// the API's error responses (429 etc.) omit CORS headers.
import { cachedFetchJson } from "../lib/cache";

const BASE = "/s2api/graph/v1";
const SEARCH_FIELDS =
  "title,authors,year,venue,citationCount,abstract,tldr,openAccessPdf,fieldsOfStudy,externalIds";

// Map an S2 paper record to the internal paper shape used across the app
export function mapToPaper(p) {
  const abstractText = p.abstract || "";
  return {
    id: `s2_${p.paperId}`,
    s2Id: p.paperId,
    title: p.title || "(제목 없음)",
    authors: (p.authors || []).map((a) => a.name).join(", ") || "저자 정보 없음",
    year: p.year,
    citations: p.citationCount ?? 0,
    venue: p.venue || "미상",
    category: (p.fieldsOfStudy && p.fieldsOfStudy[0]) || "Search",
    pdfUrl:
      (p.openAccessPdf && p.openAccessPdf.url) ||
      `https://www.semanticscholar.org/paper/${p.paperId}`,
    tldr:
      (p.tldr && p.tldr.text) ||
      (abstractText ? abstractText.slice(0, 220) + "…" : "요약 정보가 제공되지 않습니다."),
    keyContribution: abstractText || "초록 정보가 제공되지 않습니다.",
    dataset: "—",
    metrics: "—",
    limitations: "—",
    equations: [],
    references: [],
    isExternal: true
  };
}

const ERROR_LABEL = "Semantic Scholar API 오류";

// Keyword / title / DOI / arXiv ID search (FR-1.1) — responses cached (NFR §5-1)
export async function searchPapers(query, limit = 8) {
  const url = `${BASE}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&fields=${SEARCH_FIELDS}`;
  const json = await cachedFetchJson(url, { errorLabel: ERROR_LABEL });
  // Papers without a publication year cannot be placed on the timeline axis
  return (json.data || []).filter((p) => typeof p.year === "number").map(mapToPaper);
}

// Fetch reference list of a paper (paperId + title only, for collection linking)
export async function fetchReferences(s2Id, limit = 100) {
  const url = `${BASE}/paper/${s2Id}/references?limit=${limit}&fields=title,paperId`;
  try {
    const json = await cachedFetchJson(url, { errorLabel: ERROR_LABEL });
    return (json.data || []).map((d) => d.citedPaper).filter((p) => p && p.paperId);
  } catch {
    return [];
  }
}

// Fetch citing papers (derivative direction, FR-2.1 bidirectional edges)
export async function fetchCitations(s2Id, limit = 100) {
  const url = `${BASE}/paper/${s2Id}/citations?limit=${limit}&fields=title,paperId`;
  try {
    const json = await cachedFetchJson(url, { errorLabel: ERROR_LABEL });
    return (json.data || []).map((d) => d.citingPaper).filter((p) => p && p.paperId);
  } catch {
    return [];
  }
}

const normalizeTitle = (t) => (t || "").toLowerCase().replace(/[^a-z0-9가-힣]/g, "");

// Link a newly added paper's references to papers already in the collection.
// Matches by source id (S2 paperId / OpenAlex id) first, then by normalized title
// (mock papers have no source id).
export function linkReferences(referencedPapers, collection) {
  const ids = [];
  referencedPapers.forEach((ref) => {
    const match = collection.find(
      (p) =>
        p.s2Id === ref.paperId ||
        p.oaId === ref.paperId ||
        normalizeTitle(p.title) === normalizeTitle(ref.title)
    );
    if (match && !ids.includes(match.id)) {
      ids.push(match.id);
    }
  });
  return ids;
}
