// OpenAlex API client — hybrid data fallback when Semantic Scholar fails (PRD §5-3)
// https://docs.openalex.org — no API key, CORS-enabled (Access-Control-Allow-Origin: *)
import { cachedFetchJson } from "../lib/cache";

const BASE = "https://api.openalex.org";

// OpenAlex stores abstracts as an inverted index; rebuild plain text
function reconstructAbstract(inv) {
  if (!inv) return "";
  const words = [];
  Object.entries(inv).forEach(([word, positions]) => {
    positions.forEach((pos) => {
      words[pos] = word;
    });
  });
  return words.join(" ");
}

const oaIdOf = (url) => (url || "").split("/").pop();

// Map an OpenAlex work to the internal paper shape
export function mapWorkToPaper(w) {
  const abstractText = reconstructAbstract(w.abstract_inverted_index);
  return {
    id: `oa_${oaIdOf(w.id)}`,
    oaId: oaIdOf(w.id),
    title: w.display_name || "(제목 없음)",
    authors:
      (w.authorships || []).map((a) => a.author && a.author.display_name).filter(Boolean).join(", ") ||
      "저자 정보 없음",
    year: w.publication_year,
    citations: w.cited_by_count ?? 0,
    venue:
      (w.primary_location && w.primary_location.source && w.primary_location.source.display_name) ||
      "미상",
    category: (w.primary_topic && w.primary_topic.field && w.primary_topic.field.display_name) || "Search",
    pdfUrl:
      (w.primary_location && w.primary_location.pdf_url) ||
      (w.open_access && w.open_access.oa_url) ||
      w.doi ||
      `https://openalex.org/${oaIdOf(w.id)}`,
    tldr: abstractText ? abstractText.slice(0, 220) + "…" : "요약 정보가 제공되지 않습니다.",
    keyContribution: abstractText || "초록 정보가 제공되지 않습니다.",
    dataset: "—",
    metrics: "—",
    limitations: "—",
    equations: [],
    references: [],
    referencedWorks: w.referenced_works || [],
    isExternal: true
  };
}

const ERROR_LABEL = "OpenAlex API 오류";

// Keyword search fallback (FR-1.1 via OpenAlex) — responses cached (NFR §5-1)
export async function searchOpenAlex(query, limit = 8) {
  const url = `${BASE}/works?search=${encodeURIComponent(query)}&per-page=${limit}&select=id,display_name,authorships,publication_year,cited_by_count,primary_location,primary_topic,open_access,doi,abstract_inverted_index,referenced_works`;
  const json = await cachedFetchJson(url, { errorLabel: ERROR_LABEL });
  return (json.results || []).filter((w) => typeof w.publication_year === "number").map(mapWorkToPaper);
}

// Resolve referenced work IDs to titles for collection linking (single batch call)
export async function fetchWorkReferences(paper, limit = 50) {
  const ids = (paper.referencedWorks || []).slice(0, limit).map(oaIdOf).filter(Boolean);
  if (ids.length === 0) return [];
  const url = `${BASE}/works?filter=ids.openalex:${ids.join("|")}&select=id,display_name&per-page=${limit}`;
  try {
    const json = await cachedFetchJson(url, { errorLabel: ERROR_LABEL });
    return (json.results || []).map((w) => ({ paperId: oaIdOf(w.id), title: w.display_name }));
  } catch {
    return [];
  }
}

// Fetch citing works (derivative direction, FR-2.1 bidirectional edges)
export async function fetchCitingWorks(paper, limit = 50) {
  if (!paper.oaId) return [];
  const url = `${BASE}/works?filter=cites:${paper.oaId}&select=id,display_name&per-page=${limit}`;
  try {
    const json = await cachedFetchJson(url, { errorLabel: ERROR_LABEL });
    return (json.results || []).map((w) => ({ paperId: oaIdOf(w.id), title: w.display_name }));
  } catch {
    return [];
  }
}
