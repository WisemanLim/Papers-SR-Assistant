# Papers-SR-Assistant (AI Paper Reading Cue Sheet)

[한국어 버전](./README.md) | [PRD Specification](./.docs/PRD.md)

---

## 1. Overview
**Papers-SR-Assistant** is an AI-powered academic paper reading cue sheet and citation lineage web application. It helps researchers visualize citation connections in a chronological timeline and design a structured roadmap (cue sheet) to read papers systematically.

- **Domain**: Academic Research Support / Science
- **Key Features**:
  - **Live Academic Search (FR-1.1/1.2, hybrid)**: Press Enter in the search bar to query the Semantic Scholar Graph API (keyword, title, DOI, arXiv ID), with **automatic OpenAlex fallback** on failure (the dropdown shows the data source); adding a result fetches its reference list and auto-links citation edges to papers already in the collection.
  - **Auto-generated Reading Rationales (FR-3.2)**: Each cue sheet step gets a rationale derived from citation-graph structure — foundation / bridge / frontier (with domain-shift detection) / standalone. Works for externally added papers and is included in Markdown exports.
  - **Time-aligned Citation Network**: Chronological timeline showing citation links (nodes colored by selection/seed/normal status); the axis range extends automatically to fit added papers.
  - **Relation Filtering (FR-2.2)**: Filter the graph relative to the selected paper — prior works (transitive references), derivative works (transitive citers), and similar papers (bibliographic coupling + same category).
  - **Paper Cue Sheet Roadmap (FR-3.3)**: Automatic topological sorting or chronological layout, **drag-and-drop reordering** in manual mode, and per-paper **memos**.
  - **AI Summary & Interactive Chatbot (hybrid LLM)**: Gemini (gemini-2.0-flash) when an API key is set, **automatic local Ollama fallback** otherwise, rule-based simulator as the last resort — the paper's context (title, summary, contributions, limitations, equations) is injected as the system prompt for grounded answers. External papers get an "AI 한글 요약 생성" button that generates a persisted Korean TL;DR. The chat tab shows the active engine badge.
  - **Multi-format Export (FR-5.1)**: Download the cue sheet as **Markdown (.md), CSV (.csv), or BibTeX (.bib)** — memos included.
  - **Workspace Persistence + Caching (Phase 1 "save" / NFR §5-1)**: Added papers, citation-edge patches, cue sheet, seeds, memos, and sort mode auto-persist to localStorage. API responses are cached with a 24h TTL to reduce rate-limit pressure. A header "초기화" (reset) button clears everything.
  - **Bidirectional Citation Linking (FR-2.1)**: Adding a paper looks up both its references (prior) and its citations (derivative) to auto-create edges with papers already in the collection. Default node colors map publication year to hue.
  - **Recommendation Ranking (FR-1.3)**: Seed-relative relevance scoring — direct citation + bibliographic coupling + co-citation + token (Jaccard) text similarity — lists related papers by descending relevance % with one-click add, below the cue sheet.
  - **Responsive Layout (NFR §5-2)**: Tablet landscape (≤1180px) adjusts column ratios; tablet portrait (≤920px) gives the graph full width with the cue sheet and detail panels as slide-over overlays (header toggle buttons + backdrop dismiss).
  - **Cue Sheet Share Links (Phase 3, serverless)**: The entire workspace is encoded into the URL hash (`#share=`) — the "공유" (share) button generates the link and copies it to the clipboard; recipients restore losslessly after a confirm (works in fresh and already-open tabs; no backend required).
  - **In-app PDF Viewer + Selection AI Explanation (FR-4.3)**: pdf.js-based full-screen reader — page navigation, selectable text layer, drag text → "AI 해설" drawer powered by the hybrid LLM. arXiv PDFs go through the `/arxiv` proxy (CORS bypass); load failures fall back to an open-in-new-tab link.
  - **Real-time Multi-user Collaboration (Phase 3, WebSocket backend)**: The header "협업" button starts a shared session (join link auto-copied) — participants' cue sheets, memos, seeds, and external papers sync bidirectionally in real time (last-write-wins). Peer-count badge, leave detection, and an error badge when the server is down.

---

## 2. Architecture & Directory Structure
Built with Vite, React (JS), and CSS-in-JS/Tailwind CSS styling. It runs entirely on the client-side utilizing a local preset database to bypass academic API CORS restrictions and maximize responsiveness.

```text
Papers-SR-Assistant/
├── dist/                     # Production build outputs
├── public/                   # Static assets (logos, icons)
├── server/
│   └── collab-server.mjs     # Real-time collaboration WebSocket server (ws, :8787, per-session broadcast)
├── src/
│   ├── api/
│   │   ├── semanticScholar.js # Semantic Scholar Graph API client (search & reference linking, via /s2api proxy)
│   │   ├── openAlex.js       # OpenAlex fallback client (inverted-index abstract rebuild, batch reference lookup, direct CORS)
│   │   ├── llm.js            # Hybrid LLM (Gemini → Ollama via /ollama proxy → simulator, paper-context prompts)
│   │   └── collab.js         # Collaboration client (/collab ws proxy, join/update/peers protocol)
│   ├── lib/
│   │   ├── rationale.js      # Reading-rationale engine (foundation/bridge/frontier/standalone from citation structure)
│   │   ├── recommend.js      # Recommendation ranking (direct citation, coupling, co-citation, token similarity)
│   │   ├── storage.js        # Workspace persistence (external papers, edge patches, cue sheet, memos; defensive parsing)
│   │   ├── share.js          # Share-link encode/decode (URL hash, unicode-safe base64)
│   │   └── cache.js          # localStorage API response cache (24h TTL, errors never cached)
│   ├── components/
│   │   ├── CueSheet.jsx      # Left column: Cue sheet lists, sorting, and export
│   │   ├── GraphView.jsx     # Center column: Chronological vis-network timeline
│   │   ├── DetailPanel.jsx   # Right column: Details, LaTeX renderer, and AI Q&A Chatbot
│   │   └── PdfViewer.jsx     # Full-screen PDF reader (pdfjs-dist, text selection → AI explanation)
│   ├── data/
│   │   └── mockPapers.js     # Mock database (6 key ML/CS papers & citations)
│   ├── App.jsx               # Dashboard layout, state orchestration
│   ├── index.css             # Glassmorphism dark mode custom CSS tokens
│   └── main.jsx              # Application entry point
├── test/
│   ├── dev-env/              # Dev environment verification scenario & results
│   └── impl/
│       ├── 1/                # 1st implementation test scenario & PASS results
│       ├── 2/                # 2nd iteration (relation filter, DnD, memo, CSV/BibTeX) — PASS
│       ├── 3/                # 3rd iteration (Semantic Scholar live search & reference linking) — PASS
│       ├── 4/                # 4th iteration (rationale engine & OpenAlex fallback) — PASS
│       ├── 5/                # 5th iteration (persistence, bidirectional edges, caching) — PASS
│       ├── 6/                # 6th iteration (recommendation ranking, year-hue nodes) — PASS
│       ├── 7/                # 7th iteration (responsive tablet layout) — PASS
│       ├── 8/                # 8th iteration (cue sheet share links) — PASS
│       ├── 9/                # 9th iteration (hybrid LLM: Gemini·Ollama·simulator) — PASS
│       ├── 10/               # 10th iteration (PDF viewer + selection AI explanation) — PASS
│       └── 11/               # 11th iteration (real-time collaboration backend) — PASS
├── index.html                # Google Fonts & KaTeX CDN injection
├── package.json              # Package manifest
├── pnpm-lock.yaml            # pnpm lock file
└── vite.config.js            # Vite configuration
```

---

## 3. Prerequisites
Ensure the following packages are installed on your system before building the project:

- **Node.js**: `v22.23.1` or higher recommended
- **Package Manager**: `pnpm v11.10.0` or higher recommended (or `npm v10.x` or higher)

---

## 4. Configuration
The application ships with a local mock collection (6 papers); live academic search is a hybrid of the **Semantic Scholar Graph API** (primary) and the **OpenAlex API** (automatic fallback) — neither requires an API key.

- **API proxy**: Semantic Scholar's error responses lack CORS headers, so its calls go through the Vite proxy `/s2api` → `https://api.semanticscholar.org` ([vite.config.js](./vite.config.js) `server.proxy`/`preview.proxy`). This works on the dev and preview servers; a static-hosting deployment needs an equivalent reverse proxy. OpenAlex fully supports CORS and is called directly.
- **Rate limit**: The Semantic Scholar shared pool occasionally returns HTTP 429; the app then falls back to OpenAlex automatically (the dropdown header shows "OpenAlex … 폴백"). If both fail, an error message is shown. For heavier usage, [request an API key](https://www.semanticscholar.org/product/api). (Never commit real secrets.)
- **Local data**: The workspace (added papers, memos, etc.) lives in `localStorage` under `psra:workspace:v1`; API caches use `psra:cache:*` (24h TTL). Reset via the header "초기화" button or by clearing browser storage.
- **LLM configuration (see .env.example)**: `cp .env.example .env.local`, then set `VITE_GEMINI_API_KEY` to use Gemini (runtime injection via localStorage `psra:geminiKey`, local only). Without a key the app falls back to local **Ollama** (`http://localhost:11434` via the `/ollama` proxy) — if `VITE_OLLAMA_MODEL` is unset, the first installed model is auto-selected. Without Ollama, the rule-based simulator answers. **Never commit real API keys** (`.env*` is gitignored).

---

## 5. Usage

### 1) Install dependencies
```bash
pnpm install
```

### 2) Run development server (HMR enabled)
```bash
npm run dev
```

### 3) Production build (optimizes static assets)
```bash
npm run build
```

### 4) Preview production bundle locally
```bash
npm run preview
```

### 5) Real-time collaboration server (optional — for the collaboration feature)
```bash
pnpm collab   # = node server/collab-server.mjs, port 8787
```
Run alongside the dev server to activate the header "협업" (collaborate) button. When it's not running, the button shows a connection-failure badge and everything else keeps working.

---

## 6. Ports & Access

| Service | Protocol | Default Port | Access Path | Remarks |
| :--- | :--- | :--- | :--- | :--- |
| **Vite Dev Server** | HTTP | `5173` | `http://localhost:5173/` | Local dev server (proxies: `/s2api`·`/ollama`·`/arxiv`·`/collab`) |
| **Vite Preview** | HTTP | `4173` | `http://localhost:4173/` | Production build preview |
| **Collab Server** | WS/HTTP | `8787` | `ws://localhost:8787` · `GET /health` | `pnpm collab`, real-time session sync |

---

## 7. Key Component Data Model (Example)
```javascript
{
  id: "transformer_2017",
  title: "Attention Is All You Need",
  authors: "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin",
  venue: "NeurIPS",
  year: 2017,
  citations: 112000,
  category: "Core",
  tldr: "Proposed the Transformer architecture based solely on self-attention mechanisms, removing recurrence completely.",
  contributions: "Removed recurrent loops and introduced highly parallelizable Self-Attention, boosting training speeds and long-range dependencies.",
  datasets: "WMT 2014 English-to-German & English-to-French",
  metrics: "BLEU Score: 28.4 (En-De), 41.8 (En-Fr)",
  limitations: "Memory/compute complexity grows quadratically ($O(N^2)$) relative to input sequence length $N$.",
  equations: [
    {
      name: "Scaled Dot-Product Attention",
      latex: "Attention(Q, K, V) = \\text{softmax}(\\frac{QK^T}{\\sqrt{d_k}})V",
      description: "Computes the dot product of Query (Q) and Key (K), scaled by the square root of key dimensions (\\sqrt{d_k}), followed by softmax to weight Value (V)."
    }
  ],
  references: []
}
```

---

## 8. Testing
Every implementation iteration stores its scenario, results, and logs under `test/impl/<N>/`.

- **Dev-env Verification**: `test/dev-env/`
  - Verifies dependency integrity and Vite bundle builds. (**PASS**)
- **1st Iteration**: `test/impl/1/`
  - Verifies category filters, interactive network clicks, seed configuration, AI chat Q&A, and markdown export. (**PASS**)
- **2nd Iteration**: `test/impl/2/`
  - Verifies relation filtering (prior/derivative/similar), drag-and-drop reordering in manual mode, per-paper memos, and CSV/BibTeX/MD exports — 12 automated Playwright (Chromium) cases. (**PASS**, 12/12)
  - Re-run: start `pnpm dev`, then `node test/impl/2/logs/impl2-e2e.mjs test/impl/2/logs`
- **3rd Iteration**: `test/impl/3/`
  - Verifies live search (Enter trigger), collection add + automatic reference linking, dynamic timeline extension, and error/empty-result handling — 11 Playwright cases with API mocking. (**PASS**, 10 PASS / 1 SKIP: the live-API smoke test skipped due to the shared rate limit)
  - Re-run: start `pnpm dev`, then `node test/impl/3/logs/impl3-e2e.mjs test/impl/3/logs`
- **4th Iteration**: `test/impl/4/`
  - Verifies the four rationale types (foundation/bridge/frontier/standalone + domain shift), rationale lines in MD export, OpenAlex fallback search/add/reference-linking, dual-failure handling, and a live OpenAlex smoke test — 12 Playwright cases. (**PASS**, 12/12)
  - Re-run: start `pnpm dev`, then `node test/impl/4/logs/impl4-e2e.mjs test/impl/4/logs`
- **5th Iteration**: `test/impl/5/`
  - Verifies workspace persistence (reload restore, corrupt-data defense, reset confirm), bidirectional citation edges, and API cache hits/key separation — 10 Playwright cases. (**PASS**, 10/10)
  - Re-run: start `pnpm dev`, then `node test/impl/5/logs/impl5-e2e.mjs test/impl/5/logs`
- **6th Iteration**: `test/impl/6/`
  - Verifies recommendation ranking (default/per-preset/external-paper entry/exhausted candidates), one-click add, year-hue legend, and persistence/export regressions — 10 Playwright cases. (**PASS**, 10/10, zero defects in round 1)
  - Re-run: start `pnpm dev`, then `node test/impl/6/logs/impl6-e2e.mjs test/impl/6/logs`
- **7th Iteration**: `test/impl/7/`
  - Verifies the responsive layout: 1600/1024/800px viewport transitions, overlay panel open/close and in-panel interaction, horizontal-overflow and stale-backdrop checks — 9 Playwright cases. (**PASS**, 9/9, zero defects in round 1)
  - Re-run: start `pnpm dev`, then `node test/impl/7/logs/impl7-e2e.mjs test/impl/7/logs`
- **8th Iteration**: `test/impl/8/`
  - Verifies share-link generation (clipboard), import (accept/decline), external-paper round-trip, corrupt-hash defense, and re-share determinism — 8 Playwright cases. (**PASS**, 8/8)
  - Re-run: start `pnpm dev`, then `node test/impl/8/logs/impl8-e2e.mjs test/impl/8/logs`
- **9th Iteration**: `test/impl/9/`
  - Verifies the hybrid LLM: provider detection (Gemini/Ollama/simulator), live chat with context grounding, error fallback, external-paper Korean TL;DR generation & persistence, and a **live local Ollama (mistral) smoke test** — 9 Playwright cases. (**PASS**, 9/9)
  - Re-run: start `pnpm dev`, then `node test/impl/9/logs/impl9-e2e.mjs test/impl/9/logs`
- **10th Iteration**: `test/impl/10/`
  - Verifies the PDF viewer: arXiv proxy mapping, canvas/text-layer rendering, selection → AI explanation (prompt verified), disabled state without an LLM, load-failure fallback, and a **live 15-page arXiv load** — 10 Playwright cases. (**PASS**, 10/10, zero defects in round 1)
  - Re-run: start `pnpm dev`, then `node test/impl/10/logs/impl10-e2e.mjs test/impl/10/logs`
- **11th Iteration**: `test/impl/11/`
  - Verifies real-time collaboration: server health, session start/join (initial-state seeding), **two-page bidirectional sync (memos/cue sheet/external papers)**, leave detection, toggle-off, and server-down handling — 11 Playwright cases. (**PASS**, 11/11, zero defects in round 1)
  - Re-run: start `pnpm collab` + `pnpm dev`, then `node test/impl/11/logs/impl11-e2e.mjs test/impl/11/logs`

---

## 9. Troubleshooting & Performance Optimizations

### ① vis-network `fit` Crash due to React 19 StrictMode Double-Mount
- **Symptom**: In React 19 StrictMode, components mount twice on load. A timeout callback executing `network.fit()` fired on a destroyed network instance, throwing `TypeError: Cannot read properties of undefined (reading 'fit')`.
- **Solution**: Replaced the raw timeout with the `network.once("afterDrawing", ...)` listener to ensure the canvas is fully initialized. Additionally, monkey-patched `Network.prototype.fit`, `moveTo`, and `getScale` to silently return if `this.view` is undefined.

### ② vis-network Canvas Infinite Resize Loop (Flexbox Height 1828px Bug)
- **Symptom**: When `.graph-canvas-wrapper` used `flex: 1` in a flex column layout, a feedback loop occurred between vis.js's canvas auto-resizer and the flex layout's default `min-height: auto`. This caused the canvas to expand infinitely to 1828px, pushing all nodes offscreen.
- **Solution**: Added `min-height: 0` to `.graph-canvas-wrapper` to strictly restrict flex item auto-sizing, locking the canvas height to its exact parent height (505px).

### ③-1 Semantic Scholar API Blocked by CORS on Direct Browser Calls (found in 3rd iteration testing)
- **Symptom**: Live search failed with `blocked by CORS policy: No 'Access-Control-Allow-Origin' header`. The API's error responses (e.g. 429) omit CORS headers, so rate-limit situations surface as CORS errors.
- **Solution**: Added a `/s2api` proxy to Vite's `server.proxy`/`preview.proxy` and pointed the API client at it — calls become same-origin, eliminating CORS entirely.

### ③-2 Graph Appears Empty Right After Adding a Search Result (found in 3rd iteration testing)
- **Symptom**: The search query stayed in the input, so the local filter kept hiding every node — including the newly added paper.
- **Solution**: The query is now cleared automatically once a paper is added, so the full collection becomes visible immediately.

### ③-3 Share URL Pasted into an Open Tab Did Nothing (found in 8th iteration testing)
- **Symptom**: Navigating to a share link (`#share=...`) in a tab where the app was already open did nothing — hash-only URL changes are same-document navigations, so the page never reloads and the mount-only import logic never ran.
- **Solution**: The import logic now also runs on the `hashchange` event, covering both fresh tabs (mount) and already-open tabs (hash navigation).

### ④ KaTeX CDN Resources Blocked by SRI Integrity Mismatch (found in 2nd iteration testing)
- **Symptom**: The KaTeX CSS/JS tags in `index.html` carried invalid SHA-384 `integrity` hashes, so the browser blocked both resources (2 console errors) and LaTeX equations failed to render.
- **Solution**: Downloaded the actual katex@0.16.8 dist files, computed their hashes locally with `openssl dgst -sha384`, and replaced the `integrity` values. Retest confirmed zero console errors.

---

## 10. Roadmap / Next Steps
1. **AI Integration (PRD Phase 2)**: Embedding-based similarity for the recommender (currently token Jaccard). ~~Gemini + Ollama fallback chat/summaries~~ (9th iteration) ~~PDF viewer + selection AI explanation~~ (10th iteration)
2. **Search Enhancements**: Semantic Scholar API key (relaxed rate limit), auto-enrichment of added papers' summary/contribution fields (currently abstract-based fallbacks). ~~OpenAlex hybrid~~ (4th iteration) ~~citing-paper edge linking~~ (5th iteration)
3. **Custom Paper Upload**: PDF drag-and-drop parser leveraging local LLMs to dynamically extract contributions and metrics.
4. **Lineage Sharing (PRD Phase 3)**: Zotero & Notion integrations deferred as an **opt-in feature** (disabled by default — PRD scope adjustment 2026-07-11). ~~Shareable cue sheet URLs~~ (8th iteration) ~~Real-time collaboration backend~~ (11th iteration — production deployment still needs auth & persistent storage)
