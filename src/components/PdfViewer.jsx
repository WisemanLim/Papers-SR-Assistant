import React, { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { getDocument, GlobalWorkerOptions, TextLayer } from "pdfjs-dist";
import { detectProvider, askLLM, buildPaperSystemPrompt } from "../api/llm";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

// arxiv.org sends no CORS headers — route through the Vite /arxiv proxy
function resolvePdfUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname === "arxiv.org" || u.hostname === "www.arxiv.org") {
      return `/arxiv${u.pathname}${u.search}`;
    }
    return url;
  } catch {
    return url;
  }
}

// Full-screen PDF reader with text selection → LLM explanation (FR-4.3)
export default function PdfViewer({ paper, onClose }) {
  const [pdf, setPdf] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [loadError, setLoadError] = useState(null);
  const [provider, setProvider] = useState(null);
  const [selectedText, setSelectedText] = useState("");
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    detectProvider().then(setProvider);
  }, []);

  // Load the document
  useEffect(() => {
    let cancelled = false;
    setPdf(null);
    setLoadError(null);
    setPageNum(1);
    const task = getDocument({ url: resolvePdfUrl(paper.pdfUrl) });
    task.promise
      .then((doc) => {
        if (!cancelled) setPdf(doc);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message || "PDF 로드 실패");
      });
    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [paper]);

  // Render the current page (canvas + selectable text layer)
  useEffect(() => {
    if (!pdf || !canvasRef.current || !textLayerRef.current) return;
    let cancelled = false;

    (async () => {
      try {
        const page = await pdf.getPage(pageNum);
        if (cancelled) return;
        const viewport = page.getViewport({ scale: 1.4 });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }
        renderTaskRef.current = page.render({ canvasContext: ctx, canvas, viewport });
        await renderTaskRef.current.promise;
        if (cancelled) return;

        const layer = textLayerRef.current;
        layer.innerHTML = "";
        layer.style.width = `${viewport.width}px`;
        layer.style.height = `${viewport.height}px`;
        layer.style.setProperty("--scale-factor", String(viewport.scale));
        const textLayer = new TextLayer({
          textContentSource: page.streamTextContent(),
          container: layer,
          viewport
        });
        await textLayer.render();
      } catch (err) {
        if (!cancelled && err && err.name !== "RenderingCancelledException") {
          setLoadError(err.message || "페이지 렌더링 실패");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdf, pageNum]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleMouseUp = () => {
    const sel = (window.getSelection()?.toString() || "").trim();
    setSelectedText(sel.length >= 3 ? sel : "");
  };

  const llmReady = provider && provider.kind !== "simulator";

  const handleExplain = async () => {
    if (!llmReady || !selectedText || explaining) return;
    setExplaining(true);
    setExplanation(null);
    try {
      const answer = await askLLM(
        `다음은 논문에서 드래그로 선택한 발췌입니다:\n"""\n${selectedText}\n"""\n이 내용(수식·표·수도코드 포함 가능)을 한국어로 직관적으로 해설해 주세요.`,
        { system: buildPaperSystemPrompt(paper) }
      );
      setExplanation(answer);
    } catch (err) {
      setExplanation(`⚠️ 해설 생성 실패: ${err.message}`);
    } finally {
      setExplaining(false);
    }
  };

  return (
    <div className="pdfv-overlay">
      <div className="pdfv-modal glass">
        {/* Header */}
        <div className="pdfv-header">
          <h3 title={paper.title}>{paper.title}</h3>
          <div className="pdfv-controls">
            {pdf && (
              <>
                <button onClick={() => setPageNum((n) => Math.max(1, n - 1))} disabled={pageNum <= 1} title="이전 페이지">
                  <ChevronLeft size={15} />
                </button>
                <span className="pdfv-page-indicator">{pageNum} / {pdf.numPages}</span>
                <button onClick={() => setPageNum((n) => Math.min(pdf.numPages, n + 1))} disabled={pageNum >= pdf.numPages} title="다음 페이지">
                  <ChevronRight size={15} />
                </button>
              </>
            )}
            <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer" className="pdfv-external" title="새 탭에서 열기">
              <ExternalLink size={14} />
            </a>
            <button onClick={onClose} className="pdfv-close" title="닫기 (Esc)">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Selection action bar */}
        <div className="pdfv-actionbar">
          {selectedText ? (
            <>
              <span className="pdfv-selection" title={selectedText}>선택: "{selectedText.slice(0, 60)}{selectedText.length > 60 ? "…" : ""}"</span>
              <button className="pdfv-explain-btn" onClick={handleExplain} disabled={!llmReady || explaining} title={llmReady ? "선택 영역 AI 해설" : "LLM 미구성 (Gemini 키 또는 Ollama 필요)"}>
                {explaining ? <Loader2 size={13} className="pdfv-spin" /> : <Sparkles size={13} />}
                <span>{explaining ? "해설 생성 중…" : "AI 해설"}</span>
              </button>
            </>
          ) : (
            <span className="pdfv-hint">본문에서 수식·표·문장을 드래그하면 AI 해설을 요청할 수 있습니다. (엔진: {provider ? provider.label : "감지 중…"})</span>
          )}
        </div>

        {/* Body */}
        <div className="pdfv-body">
          {loadError ? (
            <div className="pdfv-error">
              <p>PDF 를 불러오지 못했습니다.</p>
              <p className="pdfv-error-detail">{loadError}</p>
              <a href={paper.pdfUrl} target="_blank" rel="noopener noreferrer">새 탭에서 열기 ↗</a>
            </div>
          ) : !pdf ? (
            <div className="pdfv-loading">
              <Loader2 size={22} className="pdfv-spin" />
              <span>PDF 로딩 중…</span>
            </div>
          ) : (
            <div className="pdfv-page-wrap" onMouseUp={handleMouseUp}>
              <canvas ref={canvasRef} />
              <div ref={textLayerRef} className="pdf-text-layer" />
            </div>
          )}
        </div>

        {/* Explanation drawer */}
        {(explanation || explaining) && (
          <div className="pdfv-explanation">
            <div className="pdfv-explanation-title">
              <Sparkles size={13} />
              <span>AI 해설</span>
              <button onClick={() => setExplanation(null)} title="해설 닫기"><X size={13} /></button>
            </div>
            <p>{explaining ? "해설을 생성하는 중…" : explanation}</p>
          </div>
        )}
      </div>

      <style>{`
        .pdfv-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .pdfv-modal {
          width: min(960px, 96vw);
          height: 92vh;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: hsl(222, 24%, 8%);
          border: 1px solid var(--border-color);
        }

        .pdfv-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border-color);
        }

        .pdfv-header h3 {
          font-size: 0.85rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pdfv-controls {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-shrink: 0;
        }

        .pdfv-controls button, .pdfv-external {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          border-radius: 6px;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .pdfv-controls button:hover:not(:disabled), .pdfv-external:hover {
          color: var(--text-primary);
          border-color: var(--accent-purple);
        }

        .pdfv-controls button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .pdfv-page-indicator {
          font-size: 0.72rem;
          color: var(--text-muted);
          min-width: 46px;
          text-align: center;
        }

        .pdfv-actionbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          padding: 8px 16px;
          border-bottom: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.15);
          min-height: 38px;
        }

        .pdfv-hint, .pdfv-selection {
          font-size: 0.7rem;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pdfv-selection {
          color: var(--text-secondary);
        }

        .pdfv-explain-btn {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          gap: 5px;
          background: rgba(147, 51, 234, 0.12);
          border: 1px solid rgba(147, 51, 234, 0.4);
          color: var(--accent-purple);
          padding: 5px 10px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .pdfv-explain-btn:hover:not(:disabled) {
          background: var(--accent-purple);
          color: white;
        }

        .pdfv-explain-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pdfv-body {
          flex: 1;
          overflow: auto;
          display: flex;
          justify-content: center;
          padding: 16px;
          background: rgba(0, 0, 0, 0.25);
        }

        .pdfv-page-wrap {
          position: relative;
          height: fit-content;
        }

        .pdfv-page-wrap canvas {
          display: block;
          border-radius: 4px;
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
        }

        .pdf-text-layer {
          position: absolute;
          inset: 0;
          overflow: hidden;
          line-height: 1;
        }

        .pdf-text-layer span {
          position: absolute;
          white-space: pre;
          transform-origin: 0 0;
          color: transparent;
          cursor: text;
        }

        .pdf-text-layer ::selection {
          background: rgba(147, 51, 234, 0.45);
        }

        .pdfv-loading, .pdfv-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: var(--text-muted);
          font-size: 0.8rem;
        }

        .pdfv-error-detail {
          font-size: 0.68rem;
          opacity: 0.7;
          max-width: 480px;
          text-align: center;
        }

        .pdfv-error a {
          color: var(--accent-purple);
          font-size: 0.75rem;
        }

        .pdfv-spin {
          animation: pdfv-rot 0.9s linear infinite;
        }

        @keyframes pdfv-rot {
          to { transform: rotate(360deg); }
        }

        .pdfv-explanation {
          border-top: 1px solid var(--border-color);
          background: rgba(147, 51, 234, 0.05);
          padding: 10px 16px;
          max-height: 30%;
          overflow-y: auto;
        }

        .pdfv-explanation-title {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          color: var(--accent-purple);
          margin-bottom: 6px;
        }

        .pdfv-explanation-title button {
          margin-left: auto;
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .pdfv-explanation p {
          font-size: 0.75rem;
          line-height: 1.5;
          color: var(--text-secondary);
          white-space: pre-wrap;
        }
      `}</style>
    </div>
  );
}
