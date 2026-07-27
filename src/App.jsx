import React, { useState, useEffect, useRef } from "react";
import { mockPapers } from "./data/mockPapers";
import { searchPapers, fetchReferences, fetchCitations, linkReferences } from "./api/semanticScholar";
import { searchOpenAlex, fetchWorkReferences, fetchCitingWorks } from "./api/openAlex";
import { generateRationale } from "./lib/rationale";
import { recommendPapers } from "./lib/recommend";
import { loadPersistedState, buildInitialPapers, persistState, clearPersistedState, snapshotWorkspace } from "./lib/storage";
import { encodeShareUrl, decodeShareHash, clearShareHash } from "./lib/share";
import { createCollabSession } from "./api/collab";
import GraphView from "./components/GraphView";
import CueSheet from "./components/CueSheet";
import DetailPanel from "./components/DetailPanel";
import PdfViewer from "./components/PdfViewer";
import { Sparkles, Search, SlidersHorizontal, BookOpen, Layers, RefreshCw, Loader2, Plus, FileText, Users } from "lucide-react";

const DEFAULT_SEEDS = ["transformer_2017"];
const DEFAULT_CUE_IDS = ["transformer_2017", "bert_2018", "vit_2020", "swin_2021"];

// Restore the persisted workspace once at module evaluation (before first render)
const persisted = loadPersistedState();

export default function App() {
  const [papers, setPapers] = useState(() => buildInitialPapers(persisted));
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [seedPapers, setSeedPapers] = useState(persisted?.seedPapers ?? DEFAULT_SEEDS);
  const [cueSheetIds, setCueSheetIds] = useState(persisted?.cueSheetIds ?? DEFAULT_CUE_IDS);
  const [sortMode, setSortMode] = useState(persisted?.sortMode ?? "topological");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [relationFilter, setRelationFilter] = useState("all");
  const [memos, setMemos] = useState(persisted?.memos ?? {});
  const [remoteResults, setRemoteResults] = useState(null); // null = closed, [] = no results
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState(null);
  const [remoteSource, setRemoteSource] = useState(null); // "Semantic Scholar" | "OpenAlex"
  const [addingId, setAddingId] = useState(null);
  const [mobilePanel, setMobilePanel] = useState("none"); // "none" | "left" | "right" (≤920px overlay)
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [collab, setCollab] = useState({ active: false, sessionId: null, peers: 0, error: false });
  const collabRef = useRef(null); // live session handle
  const applyingRemoteRef = useRef(false); // suppress re-broadcast of remote updates
  
  // Set default selected paper on load
  useEffect(() => {
    if (papers.length > 0) {
      setSelectedPaper(papers[0]);
    }
  }, []);

  // Serializable workspace snapshot (shared by share links & collaboration)
  const buildWorkspaceState = () => ({
    cueSheetIds,
    seedPapers,
    sortMode,
    memos,
    ...snapshotWorkspace(papers)
  });

  // Apply a remote/shared workspace state without re-broadcasting it
  const applyRemoteState = (state) => {
    if (!state || !Array.isArray(state.cueSheetIds)) return;
    applyingRemoteRef.current = true;
    setPapers(buildInitialPapers(state));
    setCueSheetIds(state.cueSheetIds ?? DEFAULT_CUE_IDS);
    setSeedPapers(state.seedPapers ?? DEFAULT_SEEDS);
    setSortMode(state.sortMode ?? "topological");
    setMemos(state.memos ?? {});
    // Safety net: if React bails out (identical state), the effect below never
    // runs, so also clear the flag on a timer
    setTimeout(() => {
      applyingRemoteRef.current = false;
    }, 80);
  };

  // Persist the workspace whenever it changes (Phase 1 "저장") and, when a
  // collaboration session is live, broadcast local changes (Phase 3)
  useEffect(() => {
    persistState({ papers, cueSheetIds, seedPapers, memos, sortMode });
    if (applyingRemoteRef.current) {
      applyingRemoteRef.current = false;
      return;
    }
    if (collabRef.current) {
      collabRef.current.send(buildWorkspaceState());
    }
  }, [papers, cueSheetIds, seedPapers, memos, sortMode]);

  // Start / stop a real-time collaboration session (toggle)
  const handleToggleCollab = (joinId) => {
    if (collabRef.current) {
      collabRef.current.close();
      return; // onClose resets the UI state
    }
    const sessionId =
      joinId ||
      (window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID().slice(0, 8)
        : String(Date.now()));
    const session = createCollabSession({
      sessionId,
      initialState: buildWorkspaceState(),
      onInit: (state) => {
        if (state) applyRemoteState(state);
      },
      onUpdate: (state) => applyRemoteState(state),
      onPeers: (count) => setCollab((c) => ({ ...c, peers: count })),
      onError: () => {
        collabRef.current = null;
        setCollab({ active: false, sessionId: null, peers: 0, error: true });
      },
      onClose: () => {
        collabRef.current = null;
        setCollab((c) => ({ active: false, sessionId: null, peers: 0, error: c.error }));
      }
    });
    collabRef.current = session;
    setCollab({ active: true, sessionId, peers: 1, error: false });
    // Copy the join link (best-effort)
    const url = `${window.location.origin}${window.location.pathname}#collab=${sessionId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  };

  // Join a collaboration session from the URL hash (#collab=<id>)
  useEffect(() => {
    const tryJoin = () => {
      const m = /#collab=([A-Za-z0-9-]+)/.exec(window.location.hash);
      if (!m) return;
      clearShareHash();
      if (window.confirm("협업 세션에 참여할까요? 세션의 공유 상태로 동기화됩니다.")) {
        handleToggleCollab(m[1]);
      }
    };
    tryJoin();
    window.addEventListener("hashchange", tryJoin);
    return () => window.removeEventListener("hashchange", tryJoin);
  }, []);

  // Import a shared cue sheet from the URL hash (#share=..., Phase 3).
  // Runs on mount (fresh open of a share link) AND on hashchange (link pasted
  // into an already-open tab — hash-only navigation does not reload the page).
  useEffect(() => {
    const tryImport = () => {
      const shared = decodeShareHash(window.location.hash);
      if (!shared) return;
      if (window.confirm("공유된 큐시트를 불러올까요? 현재 워크스페이스가 대체됩니다.")) {
        const nextPapers = buildInitialPapers(shared);
        setPapers(nextPapers);
        setCueSheetIds(shared.cueSheetIds ?? DEFAULT_CUE_IDS);
        setSeedPapers(shared.seedPapers ?? DEFAULT_SEEDS);
        setSortMode(shared.sortMode ?? "topological");
        setMemos(shared.memos ?? {});
        const firstCued = nextPapers.find((p) => (shared.cueSheetIds || []).includes(p.id));
        if (firstCued) setSelectedPaper(firstCued);
      }
      clearShareHash();
    };
    tryImport();
    window.addEventListener("hashchange", tryImport);
    return () => window.removeEventListener("hashchange", tryImport);
  }, []);

  // Build a share URL for the current workspace and copy it to the clipboard
  const handleShare = async () => {
    const { externalPapers, refPatches } = snapshotWorkspace(papers);
    const url = encodeShareUrl({ cueSheetIds, seedPapers, sortMode, memos, externalPapers, refPatches });
    try {
      await navigator.clipboard.writeText(url);
      return url;
    } catch {
      // Clipboard unavailable (permissions/insecure context) — still return the URL for display
      return url;
    }
  };

  // Reset the workspace to the shipped defaults (clears persistence + API cache)
  const handleResetWorkspace = () => {
    if (!window.confirm("워크스페이스를 초기화할까요? 추가한 논문·메모·정렬 상태가 모두 삭제됩니다.")) {
      return;
    }
    clearPersistedState();
    setPapers(mockPapers);
    setSelectedPaper(mockPapers[0]);
    setSeedPapers(DEFAULT_SEEDS);
    setCueSheetIds(DEFAULT_CUE_IDS);
    setSortMode("topological");
    setMemos({});
    setRelationFilter("all");
    setCategoryFilter("All");
    setSearchQuery("");
    setRemoteResults(null);
  };

  // Compute cue sheet order based on sort mode
  const getOrderedCueSheet = () => {
    // Get paper objects in the cue sheet
    const currentPapers = papers.filter((p) => cueSheetIds.includes(p.id));

    if (sortMode === "year") {
      // Chronological sort
      return [...currentPapers].sort((a, b) => a.year - b.year);
    } 
    
    if (sortMode === "topological") {
      // Topological sort based on citation references
      const result = [];
      const visited = new Set();
      const tempVisited = new Set();

      const visit = (nodeId) => {
        if (tempVisited.has(nodeId)) {
          // Cycle detected (should not happen in citations, but prevent infinite loop)
          return;
        }
        if (!visited.has(nodeId)) {
          tempVisited.add(nodeId);
          
          const paper = currentPapers.find((p) => p.id === nodeId);
          if (paper && paper.references) {
            // Visit all references that are also in the current cue sheet first
            paper.references.forEach((refId) => {
              if (cueSheetIds.includes(refId)) {
                visit(refId);
              }
            });
          }
          
          tempVisited.delete(nodeId);
          visited.add(nodeId);
          
          const paperObj = currentPapers.find((p) => p.id === nodeId);
          if (paperObj) {
            result.push(paperObj);
          }
        }
      };

      // Start visiting all nodes in the cue sheet
      cueSheetIds.forEach((id) => {
        if (!visited.has(id)) {
          visit(id);
        }
      });

      return result;
    }

    // Manual mode (preserves cueSheetIds array ordering directly)
    return cueSheetIds
      .map((id) => currentPapers.find((p) => p.id === id))
      .filter(Boolean);
  };

  const cueSheet = getOrderedCueSheet();

  // Add paper to cue sheet
  const handleAddToCueSheet = (paper) => {
    if (!cueSheetIds.includes(paper.id)) {
      setCueSheetIds((prev) => [...prev, paper.id]);
    }
  };

  // Remove paper from cue sheet
  const handleRemoveFromCueSheet = (paperId) => {
    setCueSheetIds((prev) => prev.filter((id) => id !== paperId));
  };

  // Toggle seed status of paper (Double-click event)
  const handleToggleSeed = (paperId) => {
    setSeedPapers((prev) => {
      const isSeed = prev.includes(paperId);
      let nextSeeds;
      if (isSeed) {
        nextSeeds = prev.filter((id) => id !== paperId);
      } else {
        nextSeeds = [...prev, paperId];
        // Automatically add to cue sheet if it becomes a seed
        if (!cueSheetIds.includes(paperId)) {
          setCueSheetIds((prevIds) => [...prevIds, paperId]);
        }
      }
      return nextSeeds;
    });
  };

  // Manual reordering handler
  const handleMoveItem = (index, direction) => {
    if (sortMode !== "manual") return;
    const nextIds = [...cueSheetIds];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= nextIds.length) return;

    // Swap IDs
    const temp = nextIds[index];
    nextIds[index] = nextIds[targetIndex];
    nextIds[targetIndex] = temp;
    setCueSheetIds(nextIds);
  };

  // Drag & drop reordering handler (manual mode only)
  const handleReorderItem = (fromIndex, toIndex) => {
    if (sortMode !== "manual") return;
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    const nextIds = [...cueSheetIds];
    if (fromIndex >= nextIds.length || toIndex >= nextIds.length) return;
    const [moved] = nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, moved);
    setCueSheetIds(nextIds);
  };

  // Switching to manual mode adopts the currently displayed order
  const handleChangeSortMode = (mode) => {
    if (mode === "manual") {
      setCueSheetIds(cueSheet.map((p) => p.id));
    }
    setSortMode(mode);
  };

  // Update a paper's Korean TL;DR from the LLM (FR-4.2, external papers)
  const handleUpdateTldr = (paperId, tldr) => {
    if (!tldr) return;
    setPapers((prev) => prev.map((p) => (p.id === paperId ? { ...p, tldr } : p)));
    setSelectedPaper((prev) => (prev && prev.id === paperId ? { ...prev, tldr } : prev));
  };

  // Per-paper memo handler
  const handleUpdateMemo = (paperId, text) => {
    setMemos((prev) => {
      const next = { ...prev };
      if (text.trim() === "") {
        delete next[paperId];
      } else {
        next[paperId] = text;
      }
      return next;
    });
  };

  // Remote academic search (FR-1.1) — Semantic Scholar first, OpenAlex fallback (PRD §5-3)
  const handleRemoteSearch = async () => {
    const query = searchQuery.trim();
    if (query === "" || remoteLoading) return;
    setRemoteLoading(true);
    setRemoteError(null);
    setRemoteResults(null);
    setRemoteSource(null);
    try {
      const results = await searchPapers(query);
      setRemoteResults(results);
      setRemoteSource("Semantic Scholar");
    } catch (s2Err) {
      try {
        const results = await searchOpenAlex(query);
        setRemoteResults(results);
        setRemoteSource("OpenAlex");
      } catch (oaErr) {
        setRemoteError(`두 학술 API 모두 실패 — ${s2Err.message} / ${oaErr.message}`);
        setRemoteResults([]);
      }
    } finally {
      setRemoteLoading(false);
    }
  };

  // Add a search result to the collection, linking its references to existing papers (FR-1.2)
  const handleAddExternalPaper = async (result) => {
    if (papers.some((p) => p.id === result.id)) {
      setSelectedPaper(papers.find((p) => p.id === result.id));
      setRemoteResults(null);
      return;
    }
    setAddingId(result.id);
    let references = [];
    let citedByIds = [];
    try {
      // Reference source depends on which API produced the result (prior direction)
      const refs = result.oaId
        ? await fetchWorkReferences(result)
        : await fetchReferences(result.s2Id);
      references = linkReferences(refs, papers);
      // Citing papers already in the collection (derivative direction, FR-2.1 bidirectional)
      const citing = result.oaId
        ? await fetchCitingWorks(result)
        : await fetchCitations(result.s2Id);
      citedByIds = linkReferences(citing, papers);
    } catch {
      // Edge linking is best-effort; the paper is still added without edges
    }
    const newPaper = { ...result, references };
    setPapers((prev) =>
      prev
        .map((p) =>
          citedByIds.includes(p.id) && !(p.references || []).includes(newPaper.id)
            ? { ...p, references: [...(p.references || []), newPaper.id] }
            : p
        )
        .concat(newPaper)
    );
    setSelectedPaper(newPaper);
    setAddingId(null);
    setRemoteResults(null);
    // Clear the query so the local filter doesn't hide the newly added paper
    setSearchQuery("");
  };

  // Shared file download helper
  const downloadFile = (content, filename, mime) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export to Markdown
  const handleExportMarkdown = () => {
    let mdContent = `# 📚 학술 연구 읽기 큐시트 (Reading Cue Sheet)\n`;
    mdContent += `*생성일: ${new Date().toLocaleDateString('ko-KR')} | 정렬 기준: ${
      sortMode === "topological" ? "자동 위상 정렬" : sortMode === "year" ? "발행 연도순" : "사용자 지정 수동 정렬"
    }*\n\n`;
    mdContent += `연구 분야를 완독하기 위해 생성된 단계별 읽기 경로입니다.\n\n`;
    mdContent += `## 🧭 읽기 로드맵 개요\n\n`;
    
    cueSheet.forEach((paper, idx) => {
      mdContent += `### STEP ${String(idx + 1).padStart(2, "0")}. ${paper.title} (${paper.year})\n`;
      mdContent += `* **저자**: ${paper.authors}\n`;
      mdContent += `* **학회**: ${paper.venue} (피인용 수: ${paper.citations.toLocaleString()}회)\n`;
      mdContent += `* **분야**: ${paper.category}\n`;
      mdContent += `* **읽기 근거**: ${generateRationale(paper, cueSheet)}\n`;
      mdContent += `* **AI 요약**: ${paper.tldr}\n`;
      mdContent += `* **핵심 기여**: ${paper.keyContribution}\n`;
      mdContent += `* **실험 환경**: 데이터셋 - ${paper.dataset} | 성능 - ${paper.metrics}\n`;
      mdContent += `* **한계점**: ${paper.limitations}\n`;
      if (memos[paper.id]) {
        mdContent += `* **📝 내 메모**: ${memos[paper.id]}\n`;
      }
      mdContent += `\n---\n\n`;
    });

    downloadFile(
      mdContent,
      `Papers-CueSheet-${new Date().toISOString().slice(0, 10)}.md`,
      "text/markdown;charset=utf-8;"
    );
  };

  // Export to CSV (BOM for Excel Korean compatibility)
  const handleExportCsv = () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const headers = [
      "Step", "Title", "Authors", "Year", "Venue", "Category",
      "Citations", "TLDR", "KeyContribution", "Dataset", "Metrics", "Limitations", "Memo"
    ];
    const rows = cueSheet.map((paper, idx) => [
      idx + 1, paper.title, paper.authors, paper.year, paper.venue, paper.category,
      paper.citations, paper.tldr, paper.keyContribution, paper.dataset,
      paper.metrics, paper.limitations, memos[paper.id] || ""
    ].map(esc).join(","));

    const csvContent = "\uFEFF" + headers.map(esc).join(",") + "\n" + rows.join("\n");
    downloadFile(
      csvContent,
      `Papers-CueSheet-${new Date().toISOString().slice(0, 10)}.csv`,
      "text/csv;charset=utf-8;"
    );
  };

  // Export to BibTeX
  const handleExportBibtex = () => {
    const bibEntries = cueSheet.map((paper) => {
      const authorsBib = paper.authors.split(",").map((s) => s.trim()).join(" and ");
      const isPreprint = paper.venue === "arXiv";
      const entryType = isPreprint ? "article" : "inproceedings";
      const venueField = isPreprint
        ? `  journal      = {arXiv preprint},`
        : `  booktitle    = {${paper.venue}},`;
      return [
        `@${entryType}{${paper.id},`,
        `  title        = {${paper.title}},`,
        `  author       = {${authorsBib}},`,
        `  year         = {${paper.year}},`,
        venueField,
        `  url          = {${paper.pdfUrl}},`,
        `}`
      ].join("\n");
    });

    downloadFile(
      bibEntries.join("\n\n") + "\n",
      `Papers-CueSheet-${new Date().toISOString().slice(0, 10)}.bib`,
      "application/x-bibtex;charset=utf-8;"
    );
  };

  // Export dispatcher
  const handleExport = (format) => {
    if (format === "md") handleExportMarkdown();
    else if (format === "csv") handleExportCsv();
    else if (format === "bibtex") handleExportBibtex();
  };

  // Apply Presets (Helper to demo/initialize fast)
  const applyPreset = (presetName) => {
    if (presetName === "transformer-all") {
      setSeedPapers(["transformer_2017"]);
      setCueSheetIds(["transformer_2017", "bert_2018", "roberta_2019", "vit_2020", "deit_2020", "swin_2021"]);
      setSortMode("topological");
    } else if (presetName === "nlp-only") {
      setSeedPapers(["bert_2018"]);
      setCueSheetIds(["transformer_2017", "bert_2018", "roberta_2019"]);
      setSortMode("year");
    } else if (presetName === "vision-only") {
      setSeedPapers(["vit_2020"]);
      setCueSheetIds(["transformer_2017", "vit_2020", "deit_2020", "swin_2021"]);
      setSortMode("topological");
    }
  };

  // Compute related paper IDs for the selected paper (FR-2.2 relation filtering)
  const getRelationIds = () => {
    if (!selectedPaper || relationFilter === "all") return null;
    const byId = new Map(papers.map((p) => [p.id, p]));

    if (relationFilter === "prior") {
      // Prior works: transitive closure of references
      const result = new Set([selectedPaper.id]);
      const stack = [...(selectedPaper.references || [])];
      while (stack.length > 0) {
        const id = stack.pop();
        if (result.has(id)) continue;
        result.add(id);
        const p = byId.get(id);
        if (p && p.references) stack.push(...p.references);
      }
      return result;
    }

    if (relationFilter === "derivative") {
      // Derivative works: papers citing the selected paper (transitively)
      const result = new Set([selectedPaper.id]);
      let changed = true;
      while (changed) {
        changed = false;
        papers.forEach((p) => {
          if (!result.has(p.id) && p.references && p.references.some((r) => result.has(r))) {
            result.add(p.id);
            changed = true;
          }
        });
      }
      return result;
    }

    // Similar papers: bibliographic coupling (shared references) or same category
    const refs = new Set(selectedPaper.references || []);
    const result = new Set([selectedPaper.id]);
    papers.forEach((p) => {
      if (p.id === selectedPaper.id) return;
      const sharesRef = p.references && p.references.some((r) => refs.has(r));
      if (sharesRef || p.category === selectedPaper.category) {
        result.add(p.id);
      }
    });
    return result;
  };

  const relationIds = getRelationIds();

  // Seed-relative related-paper ranking (FR-1.3)
  const recommendations = recommendPapers(papers, seedPapers, cueSheetIds);

  // Filter papers for network graph visualization
  const filteredPapers = papers.filter((paper) => {
    // Relation Filter (relative to selected paper)
    if (relationIds && !relationIds.has(paper.id)) {
      return false;
    }
    // Category Filter
    if (categoryFilter !== "All" && paper.category !== categoryFilter) {
      return false;
    }
    // Search Query Filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      return (
        paper.title.toLowerCase().includes(q) ||
        paper.authors.toLowerCase().includes(q) ||
        paper.venue.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header glass">
        <div className="header-logo">
          <div className="spark-icon-wrapper">
            <Sparkles size={18} className="spark-icon" />
          </div>
          <h1>Papers-SR-Assistant</h1>
          <span className="version-tag">MVP v1.0</span>
        </div>

        {/* Global Search Bar (typing = local filter, Enter = Semantic Scholar search) */}
        <div className="search-bar">
          {remoteLoading ? (
            <Loader2 size={16} className="search-icon spin" />
          ) : (
            <Search size={16} className="search-icon" />
          )}
          <input
            type="text"
            placeholder="로컬 필터 입력, Enter로 학술 검색 (제목·DOI·arXiv ID)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRemoteSearch();
              if (e.key === "Escape") setRemoteResults(null);
            }}
          />

          {/* Remote search results dropdown */}
          {remoteResults !== null && (
            <div className="search-dropdown glass">
              <div className="dropdown-header">
                <span>
                  {remoteSource || "학술"} 검색 결과 ({remoteResults.length})
                  {remoteSource === "OpenAlex" && <em className="fallback-tag"> · 폴백</em>}
                </span>
                <button onClick={() => setRemoteResults(null)}>닫기</button>
              </div>
              {remoteError ? (
                <p className="dropdown-message error">{remoteError}</p>
              ) : remoteResults.length === 0 ? (
                <p className="dropdown-message">검색 결과가 없습니다.</p>
              ) : (
                remoteResults.map((result) => {
                  const alreadyAdded = papers.some((p) => p.id === result.id);
                  return (
                    <div key={result.id} className="dropdown-item">
                      <div className="result-info">
                        <p className="result-title">{result.title}</p>
                        <p className="result-meta">
                          {result.year} · {result.venue} · 피인용 {result.citations.toLocaleString()}회
                        </p>
                      </div>
                      <button
                        className="btn-add-result"
                        disabled={addingId === result.id}
                        onClick={() => handleAddExternalPaper(result)}
                      >
                        {addingId === result.id ? (
                          <Loader2 size={13} className="spin" />
                        ) : alreadyAdded ? (
                          "보기"
                        ) : (
                          <>
                            <Plus size={13} />
                            추가
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Preset Presets */}
        <div className="preset-selector">
          <span className="preset-label">계보 프리셋:</span>
          <button onClick={() => applyPreset("transformer-all")}>전체 계보</button>
          <button onClick={() => applyPreset("nlp-only")}>NLP 계보</button>
          <button onClick={() => applyPreset("vision-only")}>비전 계보</button>
          <button
            className="btn-reset"
            onClick={handleResetWorkspace}
            title="워크스페이스 초기화 (추가 논문·메모·캐시 삭제)"
          >
            <RefreshCw size={12} />
            초기화
          </button>
          <button
            className={`btn-collab ${collab.active ? "active" : ""} ${collab.error ? "error" : ""}`}
            onClick={() => handleToggleCollab()}
            title={collab.active ? "협업 종료 (참여 링크는 클립보드에 복사됨)" : "실시간 협업 세션 시작 (링크 자동 복사)"}
          >
            <Users size={12} />
            {collab.active ? `협업 중 · ${collab.peers}명` : collab.error ? "협업 연결 실패" : "협업"}
          </button>
        </div>

        {/* Tablet/mobile panel toggles (visible ≤920px, NFR §5-2) */}
        <div className="panel-toggles">
          <button
            className={mobilePanel === "left" ? "active" : ""}
            onClick={() => setMobilePanel((p) => (p === "left" ? "none" : "left"))}
            title="읽기 큐시트 패널"
          >
            <BookOpen size={16} />
          </button>
          <button
            className={mobilePanel === "right" ? "active" : ""}
            onClick={() => setMobilePanel((p) => (p === "right" ? "none" : "right"))}
            title="논문 상세 패널"
          >
            <FileText size={16} />
          </button>
        </div>
      </header>

      {/* Backdrop for overlay panels (tablet/mobile) */}
      {mobilePanel !== "none" && (
        <div className="mobile-backdrop" onClick={() => setMobilePanel("none")} />
      )}

      {/* Main Grid Layout */}
      <main className="app-main">
        {/* Left Column: Cue Sheet */}
        <section className={`column-left ${mobilePanel === "left" ? "open" : ""}`}>
          <CueSheet
            cueSheet={cueSheet}
            selectedPaper={selectedPaper}
            onSelectPaper={setSelectedPaper}
            onRemoveFromCueSheet={handleRemoveFromCueSheet}
            onMoveItem={handleMoveItem}
            onReorderItem={handleReorderItem}
            sortMode={sortMode}
            onChangeSortMode={handleChangeSortMode}
            onExport={handleExport}
            memos={memos}
            onUpdateMemo={handleUpdateMemo}
            recommendations={recommendations}
            onAddRecommended={handleAddToCueSheet}
            onShare={handleShare}
          />
        </section>

        {/* Center Column: Interactive Graph & Filters */}
        <section className="column-center">
          <div className="graph-container glass">
            <div className="graph-header">
              <div className="graph-title-group">
                <Layers size={15} className="icon-blue" />
                <h3>시간축 인용 네트워크 시각화</h3>
              </div>
              <div className="graph-legend">
                <span className="legend-item"><span className="dot dot-selected"></span>선택됨</span>
                <span className="legend-item"><span className="dot dot-seed"></span>시드 논문</span>
                <span className="legend-item"><span className="dot dot-norm"></span>일반 논문 (색=연도)</span>
                <span className="legend-tip">*더블 클릭으로 시드 설정/해제</span>
              </div>
            </div>
            
            <div className="graph-canvas-wrapper">
              <GraphView
                papers={filteredPapers}
                selectedPaper={selectedPaper}
                onSelectPaper={setSelectedPaper}
                seedPapers={seedPapers}
                onToggleSeed={handleToggleSeed}
              />
            </div>
          </div>

          {/* Bottom Filter Controls */}
          <div className="filter-controls glass">
            <div className="filter-title">
              <SlidersHorizontal size={14} />
              <span>시각화 필터</span>
            </div>
            
            <div className="category-tabs">
              {["All", "Core", "NLP", "Vision"].map((cat) => (
                <button
                  key={cat}
                  className={categoryFilter === cat ? "active" : ""}
                  onClick={() => setCategoryFilter(cat)}
                >
                  {cat === "All" ? "전체 분야" : cat}
                </button>
              ))}
            </div>

            <div className="category-tabs relation-tabs" title="선택한 논문 기준 관계 필터">
              {[
                { key: "all", label: "관계: 전체" },
                { key: "prior", label: "선행 연구" },
                { key: "derivative", label: "후속 연구" },
                { key: "similar", label: "유사 연구" }
              ].map((rel) => (
                <button
                  key={rel.key}
                  className={relationFilter === rel.key ? "active" : ""}
                  disabled={rel.key !== "all" && !selectedPaper}
                  onClick={() => setRelationFilter(rel.key)}
                >
                  {rel.label}
                </button>
              ))}
            </div>

            <div className="filter-stats">
              <span>표시된 노드: <strong>{filteredPapers.length}</strong> / {papers.length}</span>
            </div>
          </div>
        </section>

        {/* Right Column: AI Detail Assistant */}
        <section className={`column-right ${mobilePanel === "right" ? "open" : ""}`}>
          <DetailPanel
            paper={selectedPaper}
            onAddToCueSheet={handleAddToCueSheet}
            isInCueSheet={cueSheetIds.includes(selectedPaper?.id)}
            onUpdateTldr={handleUpdateTldr}
            onOpenPdf={() => setPdfViewerOpen(true)}
          />
        </section>
      </main>

      {/* In-app PDF reader with selection → AI explanation (FR-4.3) */}
      {pdfViewerOpen && selectedPaper && (
        <PdfViewer paper={selectedPaper} onClose={() => setPdfViewerOpen(false)} />
      )}

      <style>{`
        .app-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          background: radial-gradient(circle at 50% 50%, hsl(222, 24%, 9%) 0%, hsl(222, 24%, 5%) 100%);
          overflow: hidden;
        }
        
        .app-header {
          height: 64px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          border-bottom: 1px solid var(--border-color);
          z-index: 10;
        }
        
        .header-logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .spark-icon-wrapper {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 10px rgba(147, 51, 234, 0.3);
        }
        
        .spark-icon {
          color: white;
        }
        
        .header-logo h1 {
          font-size: 1.1rem;
          font-weight: 700;
          color: white;
          background: linear-gradient(135deg, #fff 30%, var(--text-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        
        .version-tag {
          font-size: 0.65rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          padding: 2px 6px;
          border-radius: 4px;
          color: var(--text-muted);
          font-weight: 600;
        }
        
        .search-bar {
          position: relative;
          width: 280px;
        }
        
        .search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
        }
        
        .search-bar input {
          width: 100%;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 8px 12px 8px 32px;
          border-radius: 6px;
          font-size: 0.78rem;
          outline: none;
          transition: var(--transition-fast);
        }
        
        .search-bar input:focus {
          border-color: var(--accent-purple);
          background: rgba(255, 255, 255, 0.07);
          box-shadow: 0 0 10px rgba(147, 51, 234, 0.1);
        }

        .spin {
          animation: spin 0.9s linear infinite;
        }

        @keyframes spin {
          to { transform: translateY(-50%) rotate(360deg); }
        }

        .search-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          width: 420px;
          max-height: 380px;
          overflow-y: auto;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: hsl(222, 24%, 8%);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.5);
          z-index: 100;
        }

        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted);
          position: sticky;
          top: 0;
          background: hsl(222, 24%, 8%);
        }

        .fallback-tag {
          color: var(--accent-blue);
          font-style: normal;
          font-weight: 600;
        }

        .dropdown-header button {
          background: transparent;
          border: none;
          color: var(--text-muted);
          font-size: 0.68rem;
          cursor: pointer;
        }

        .dropdown-header button:hover {
          color: var(--text-primary);
        }

        .dropdown-message {
          padding: 18px 14px;
          font-size: 0.75rem;
          color: var(--text-muted);
          text-align: center;
        }

        .dropdown-message.error {
          color: #ef4444;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 14px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .dropdown-item:hover {
          background: rgba(147, 51, 234, 0.05);
        }

        .result-info {
          min-width: 0;
        }

        .result-title {
          font-size: 0.75rem;
          color: var(--text-primary);
          line-height: 1.35;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .result-meta {
          font-size: 0.65rem;
          color: var(--text-muted);
          margin-top: 3px;
        }

        .btn-add-result {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 3px;
          background: rgba(147, 51, 234, 0.12);
          border: 1px solid rgba(147, 51, 234, 0.35);
          color: var(--accent-purple);
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 0.68rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .btn-add-result:hover:not(:disabled) {
          background: var(--accent-purple);
          color: white;
        }

        .btn-add-result:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .btn-add-result .spin {
          animation: spin-plain 0.9s linear infinite;
        }

        @keyframes spin-plain {
          to { transform: rotate(360deg); }
        }
        
        .preset-selector {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .preset-label {
          font-size: 0.72rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        
        .preset-selector button {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 6px 10px;
          border-radius: 5px;
          font-size: 0.72rem;
          cursor: pointer;
          transition: var(--transition-fast);
        }
        
        .preset-selector button:hover {
          background: rgba(147, 51, 234, 0.08);
          border-color: rgba(147, 51, 234, 0.3);
          color: var(--text-primary);
        }

        .preset-selector .btn-reset {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-left: 8px;
          color: var(--text-muted);
        }

        .preset-selector .btn-reset:hover {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.35);
          color: #ef4444;
        }

        .preset-selector .btn-collab {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .preset-selector .btn-collab.active {
          background: rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.45);
          color: #22c55e;
        }

        .preset-selector .btn-collab.error {
          border-color: rgba(239, 68, 68, 0.45);
          color: #ef4444;
        }
        
        .app-main {
          display: flex;
          flex: 1;
          padding: 16px;
          gap: 16px;
          height: calc(100vh - 64px);
        }
        
        .column-left {
          width: 24%;
          height: 100%;
        }
        
        .column-center {
          width: 52%;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .column-right {
          width: 24%;
          height: 100%;
        }
        
        .graph-container {
          flex: 1;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        
        .graph-header {
          padding: 15px 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .graph-title-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .graph-title-group h3 {
          font-size: 0.9rem;
          color: var(--text-primary);
        }
        
        .icon-blue {
          color: var(--accent-blue);
        }
        
        .graph-legend {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        
        .dot-selected {
          background: hsl(270, 80%, 65%);
          box-shadow: 0 0 6px hsl(270, 80%, 65%);
        }
        
        .dot-seed {
          background: hsl(210, 85%, 60%);
          box-shadow: 0 0 6px hsl(210, 85%, 60%);
        }
        
        .dot-norm {
          background: linear-gradient(90deg, hsl(200, 55%, 40%), hsl(280, 55%, 55%));
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .legend-tip {
          opacity: 0.8;
          font-style: italic;
          border-left: 1px solid var(--border-color);
          padding-left: 10px;
        }
        
        .graph-canvas-wrapper {
          flex: 1;
          position: relative;
          min-height: 0;
        }
        
        .filter-controls {
          min-height: 52px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 8px;
          padding: 8px 20px;
        }

        .category-tabs button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        
        .filter-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        
        .category-tabs {
          display: flex;
          gap: 4px;
          background: rgba(0, 0, 0, 0.2);
          padding: 3px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
        }
        
        .category-tabs button {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.72rem;
          cursor: pointer;
          transition: var(--transition-fast);
        }
        
        .category-tabs button:hover {
          color: var(--text-primary);
        }
        
        .category-tabs button.active {
          background: rgba(255, 255, 255, 0.05);
          color: var(--accent-purple);
          border: 1px solid var(--border-color);
          font-weight: 500;
        }
        
        .filter-stats {
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        
        .filter-stats strong {
          color: var(--text-primary);
        }

        /* ===== Responsive layout (NFR §5-2) ===== */

        .panel-toggles {
          display: none;
          gap: 6px;
        }

        .panel-toggles button {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          border-radius: 8px;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .panel-toggles button.active {
          background: var(--accent-purple-glow);
          border-color: var(--accent-purple);
          color: var(--accent-purple);
        }

        .mobile-backdrop {
          position: fixed;
          inset: 64px 0 0 0;
          background: rgba(0, 0, 0, 0.55);
          z-index: 50;
        }

        @media (min-width: 921px) {
          .mobile-backdrop {
            display: none;
          }
        }

        /* Tablet landscape: tighter columns, slimmer header */
        @media (max-width: 1180px) {
          .column-left { width: 27%; }
          .column-center { width: 46%; }
          .column-right { width: 27%; }
          .search-bar { width: 210px; }
          .preset-label { display: none; }
          .version-tag { display: none; }
          .app-header { padding: 0 14px; gap: 8px; }
        }

        /* Tablet portrait: center graph full-width, side panels as slide-over overlays */
        @media (max-width: 920px) {
          .panel-toggles { display: flex; }
          .app-main { padding: 10px; gap: 10px; }
          .column-center { width: 100%; }

          .column-left,
          .column-right {
            position: fixed;
            top: 64px;
            bottom: 0;
            width: min(85vw, 380px);
            z-index: 60;
            transition: transform 0.25s ease;
            background: hsl(222, 24%, 7%);
            box-shadow: 0 0 40px rgba(0, 0, 0, 0.6);
          }

          .column-left {
            left: 0;
            transform: translateX(-105%);
            border-radius: 0 12px 12px 0;
          }

          .column-right {
            right: 0;
            transform: translateX(105%);
            border-radius: 12px 0 0 12px;
          }

          .column-left.open,
          .column-right.open {
            transform: translateX(0);
          }

          .search-bar { width: 170px; }
          .search-dropdown { width: min(90vw, 420px); }
          .preset-selector button { padding: 6px 8px; font-size: 0.68rem; }
          .graph-legend { display: none; }
        }
      `}</style>
    </div>
  );
}
