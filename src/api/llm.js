// Hybrid LLM provider (PRD Phase 2): Gemini API when a key is configured,
// automatic local Ollama fallback otherwise, rule-based simulator as the
// last resort so the app always answers.
// Ollama goes through the Vite proxy (/ollama → http://localhost:11434).

const OLLAMA_BASE = "/ollama";
const GEMINI_MODEL = "gemini-2.0-flash";

function geminiKey() {
  try {
    const k = localStorage.getItem("psra:geminiKey");
    if (k) return k;
  } catch {
    // storage unavailable
  }
  return import.meta.env.VITE_GEMINI_API_KEY || "";
}

let providerPromise = null;

// Detect once per page load: gemini → ollama → simulator
export function detectProvider() {
  if (!providerPromise) {
    providerPromise = (async () => {
      if (geminiKey()) {
        return { kind: "gemini", label: `Gemini (${GEMINI_MODEL})` };
      }
      try {
        const res = await fetch(`${OLLAMA_BASE}/api/tags`);
        if (res.ok) {
          const json = await res.json();
          const model =
            import.meta.env.VITE_OLLAMA_MODEL ||
            (json.models && json.models[0] && json.models[0].name);
          if (model) {
            return { kind: "ollama", label: `Ollama (${model})`, model };
          }
        }
      } catch {
        // Ollama not running
      }
      return { kind: "simulator", label: "규칙 기반 시뮬레이터" };
    })();
  }
  return providerPromise;
}

// System prompt grounding answers in the selected paper (hallucination guard, PRD §5-3)
export function buildPaperSystemPrompt(paper) {
  const equations = (paper.equations || [])
    .map((eq) => `- ${eq.name}: ${eq.latex}`)
    .join("\n");
  return [
    "당신은 학술 논문 리서치 어시스턴트입니다. 아래 논문 정보에 근거해서만 한국어로 간결하게 답하세요.",
    "논문 정보에 없는 내용은 추측하지 말고 모른다고 답하세요.",
    "",
    `제목: ${paper.title}`,
    `저자: ${paper.authors}`,
    `발표: ${paper.venue} (${paper.year}) · 피인용 ${paper.citations ?? 0}회`,
    `요약: ${paper.tldr}`,
    `핵심 기여: ${paper.keyContribution}`,
    `데이터셋: ${paper.dataset} · 성능: ${paper.metrics}`,
    `한계점: ${paper.limitations}`,
    equations ? `주요 수식:\n${equations}` : ""
  ].join("\n");
}

// Ask the active provider; throws when only the simulator is available
export async function askLLM(prompt, { system } = {}) {
  const provider = await detectProvider();

  if (provider.kind === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${geminiKey()}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {})
      })
    });
    if (!res.ok) throw new Error(`Gemini API 오류 (HTTP ${res.status})`);
    const json = await res.json();
    const text =
      (json.candidates &&
        json.candidates[0] &&
        json.candidates[0].content &&
        json.candidates[0].content.parts &&
        json.candidates[0].content.parts.map((p) => p.text).join("")) ||
      "";
    if (!text) throw new Error("Gemini 응답이 비어 있습니다");
    return text;
  }

  if (provider.kind === "ollama") {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: provider.model,
        stream: false,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          { role: "user", content: prompt }
        ]
      })
    });
    if (!res.ok) throw new Error(`Ollama 오류 (HTTP ${res.status})`);
    const json = await res.json();
    const text = (json.message && json.message.content) || "";
    if (!text) throw new Error("Ollama 응답이 비어 있습니다");
    return text;
  }

  throw new Error("사용 가능한 LLM 프로바이더가 없습니다");
}
