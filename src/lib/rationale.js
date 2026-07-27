// Reading-order rationale engine (FR-3.2)
// Generates a per-step Korean rationale from the citation structure of the
// current cue sheet — works for any paper, including externally added ones.

const shortTitle = (t) => (t.length > 22 ? t.slice(0, 20) + "…" : t);

export function generateRationale(paper, cueSheet) {
  const inSheet = new Map(cueSheet.map((p) => [p.id, p]));
  const prereqs = (paper.references || [])
    .filter((id) => inSheet.has(id))
    .map((id) => inSheet.get(id));
  const dependents = cueSheet.filter(
    (p) => p.id !== paper.id && (p.references || []).includes(paper.id)
  );

  // Foundation: nothing to read first, others build on it
  if (prereqs.length === 0 && dependents.length > 0) {
    return `큐시트 내 ${dependents.length}편이 직접 참조하는 기반 연구입니다. 후속 논문 이해의 전제가 되므로 가장 먼저 정독해야 합니다.`;
  }

  // Bridge: has prerequisites and dependents within the sheet
  if (prereqs.length > 0 && dependents.length > 0) {
    return `"${shortTitle(prereqs[0].title)}" 등 선행 ${prereqs.length}편의 개념 위에 서 있으며, 이후 ${dependents.length}편이 본 연구를 참조합니다. 계보를 잇는 교량 연구입니다.`;
  }

  // Frontier: builds on prerequisites, nothing in the sheet cites it yet
  if (prereqs.length > 0) {
    const domainShift = prereqs[0].category !== paper.category;
    return `"${shortTitle(prereqs[0].title)}" 등 선행 ${prereqs.length}편을 읽은 뒤 도전할 확장·응용 연구입니다.${
      domainShift ? " 선행 연구와 분야가 달라 도메인 전이 관점에서 읽으면 좋습니다." : ""
    }`;
  }

  // Standalone: no citation relation inside the sheet
  return `큐시트 내 다른 논문과 직접적인 인용 관계가 없는 독립 연구입니다. 피인용 ${(paper.citations ?? 0).toLocaleString()}회 규모의 영향력을 참고해 읽기 순서를 조정하세요.`;
}
