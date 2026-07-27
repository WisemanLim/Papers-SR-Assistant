// Related-paper recommendation ranking (FR-1.3)
// Combines direct citation, bibliographic coupling, co-citation, and
// title/abstract token similarity into a 0..1 relevance score against seeds.
// (Embedding-based similarity is deferred to the Phase 2 LLM integration.)

const STOPWORDS = new Set([
  "the", "a", "an", "of", "for", "and", "or", "in", "on", "at", "with", "to",
  "is", "are", "we", "that", "this", "by", "using", "via", "from", "as", "its"
]);

function tokens(paper) {
  const text = `${paper.title} ${paper.tldr || ""} ${paper.keyContribution || ""}`;
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9가-힣]+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t))
  );
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((t) => {
    if (b.has(t)) inter += 1;
  });
  return inter / (a.size + b.size - inter);
}

// Relevance of a candidate paper to one seed paper
export function scorePair(candidate, seed, papers) {
  const cRefs = new Set(candidate.references || []);
  const sRefs = new Set(seed.references || []);

  // Direct citation in either direction — strongest signal
  const direct = cRefs.has(seed.id) || sRefs.has(candidate.id) ? 1 : 0;

  // Bibliographic coupling: shared references
  let coupling = 0;
  cRefs.forEach((id) => {
    if (sRefs.has(id)) coupling += 1;
  });

  // Co-citation: collection papers citing both candidate and seed
  const coCite = papers.filter(
    (p) =>
      p.id !== candidate.id &&
      p.id !== seed.id &&
      (p.references || []).includes(candidate.id) &&
      (p.references || []).includes(seed.id)
  ).length;

  const textSim = jaccard(tokens(candidate), tokens(seed));

  return (
    direct * 0.4 +
    (Math.min(coupling, 3) / 3) * 0.2 +
    (Math.min(coCite, 3) / 3) * 0.15 +
    textSim * 0.25
  );
}

// Rank collection papers not yet in the cue sheet against the seed set
export function recommendPapers(papers, seedIds, cueSheetIds, topN = 5) {
  const seeds = papers.filter((p) => seedIds.includes(p.id));
  if (seeds.length === 0) return [];

  return papers
    .filter((p) => !cueSheetIds.includes(p.id) && !seedIds.includes(p.id))
    .map((paper) => ({
      paper,
      score: Math.max(...seeds.map((seed) => scorePair(paper, seed, papers)))
    }))
    .filter((r) => r.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
