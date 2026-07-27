import React, { useState, useRef } from "react";
import { Download, Play, Trash2, ArrowUp, ArrowDown, BookOpen, StickyNote, GripVertical, Wand2, Plus, Share2, Check } from "lucide-react";
import { generateRationale } from "../lib/rationale";

export default function CueSheet({
  cueSheet,
  selectedPaper,
  onSelectPaper,
  onRemoveFromCueSheet,
  onMoveItem,
  onReorderItem,
  sortMode,
  onChangeSortMode,
  onExport,
  memos,
  onUpdateMemo,
  recommendations,
  onAddRecommended,
  onShare
}) {
  const [memoEditingId, setMemoEditingId] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragIndexRef = useRef(null);

  const handleDragStart = (index) => (e) => {
    dragIndexRef.current = index;
    e.dataTransfer.effectAllowed = "move";
    // Firefox requires data to be set for drag to start
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (index) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== index) setDragOverIndex(index);
  };

  const handleDrop = (index) => (e) => {
    e.preventDefault();
    if (dragIndexRef.current !== null) {
      onReorderItem(dragIndexRef.current, index);
    }
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    dragIndexRef.current = null;
    setDragOverIndex(null);
  };

  return (
    <div className="cuesheet-container glass">
      <div className="cuesheet-header">
        <div className="title-wrapper">
          <BookOpen size={18} className="icon-purple" />
          <h2>읽기 큐시트</h2>
          <span className="count-badge">{cueSheet.length}</span>
        </div>
        <p className="subtitle">체계적 정독을 위한 최적의 학습 로드맵</p>
      </div>

      {/* Control Tools */}
      <div className="cuesheet-controls">
        <div className="select-group">
          <label>정렬 모드</label>
          <select value={sortMode} onChange={(e) => onChangeSortMode(e.target.value)}>
            <option value="topological">자동 위상 정렬 (인용 계보)</option>
            <option value="year">발행 연도순 (시간 흐름)</option>
            <option value="manual">사용자 수동 편집</option>
          </select>
        </div>

        <div className="export-group">
          <label>내보내기</label>
          <div className="export-buttons">
            <button
              className="btn-export"
              onClick={() => onExport("md")}
              disabled={cueSheet.length === 0}
              title="Markdown(.md)으로 내보내기"
            >
              <Download size={13} />
              <span>MD</span>
            </button>
            <button
              className="btn-export"
              onClick={() => onExport("csv")}
              disabled={cueSheet.length === 0}
              title="CSV(.csv)로 내보내기"
            >
              <Download size={13} />
              <span>CSV</span>
            </button>
            <button
              className="btn-export"
              onClick={() => onExport("bibtex")}
              disabled={cueSheet.length === 0}
              title="BibTeX(.bib)로 내보내기"
            >
              <Download size={13} />
              <span>BibTeX</span>
            </button>
            <button
              className={`btn-export btn-share ${shareCopied ? "copied" : ""}`}
              onClick={async () => {
                await onShare();
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 2000);
              }}
              disabled={cueSheet.length === 0}
              title="공유 링크 생성 (클립보드 복사)"
            >
              {shareCopied ? <Check size={13} /> : <Share2 size={13} />}
              <span>{shareCopied ? "복사됨" : "공유"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Manual mode drag hint */}
      {sortMode === "manual" && (
        <div className="dnd-hint">
          <GripVertical size={12} />
          <span>카드를 드래그하여 순서를 변경할 수 있습니다.</span>
        </div>
      )}

      {/* Cue Sheet Items */}
      <div className="cuesheet-list">
        {cueSheet.length === 0 ? (
          <div className="empty-state">
            <Play size={24} style={{ opacity: 0.3, marginBottom: '10px' }} />
            <p>큐시트가 비어 있습니다.</p>
            <p className="detail">중앙 그래프에서 논문을 더블 클릭하거나 우측 패널에서 추가해 주세요.</p>
          </div>
        ) : (
          cueSheet.map((paper, index) => {
            const isSelected = selectedPaper && selectedPaper.id === paper.id;
            
            // Structural reading rationale from the citation graph (FR-3.2)
            const rationale = generateRationale(paper, cueSheet);

            const memo = memos[paper.id] || "";
            const isMemoEditing = memoEditingId === paper.id;

            return (
              <div
                key={paper.id}
                className={`cuesheet-item ${isSelected ? "active" : ""} ${
                  dragOverIndex === index ? "drag-over" : ""
                }`}
                onClick={() => onSelectPaper(paper)}
                draggable={sortMode === "manual"}
                onDragStart={handleDragStart(index)}
                onDragOver={sortMode === "manual" ? handleDragOver(index) : undefined}
                onDrop={sortMode === "manual" ? handleDrop(index) : undefined}
                onDragEnd={handleDragEnd}
              >
                {/* Drag Handle (manual mode) */}
                {sortMode === "manual" && (
                  <div className="drag-handle" title="드래그하여 순서 변경">
                    <GripVertical size={14} />
                  </div>
                )}

                {/* Index Card Indicator */}
                <div className="item-index-badge">
                  <span>STEP</span>
                  <strong>{String(index + 1).padStart(2, "0")}</strong>
                </div>

                {/* Content */}
                <div className="item-content">
                  <div className="item-meta">
                    <span className={`badge ${
                      paper.category === "Core" ? "badge-purple" :
                      paper.category === "NLP" ? "badge-blue" : "badge-cyan"
                    }`}>{paper.category}</span>
                    <span className="item-year">{paper.year} • {paper.venue}</span>
                  </div>
                  <h3 className="item-title">{paper.title}</h3>
                  <p className="item-rationale">{rationale}</p>

                  {/* Memo display / editor */}
                  {isMemoEditing ? (
                    <div className="memo-editor" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        autoFocus
                        defaultValue={memo}
                        placeholder="이 논문에 대한 메모를 입력하세요..."
                        onBlur={(e) => {
                          onUpdateMemo(paper.id, e.target.value);
                          setMemoEditingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            e.target.blur();
                          }
                          if (e.key === "Escape") {
                            setMemoEditingId(null);
                          }
                        }}
                      />
                      <p className="memo-help">Enter 저장 · Shift+Enter 줄바꿈 · Esc 취소</p>
                    </div>
                  ) : (
                    memo && (
                      <p
                        className="item-memo"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMemoEditingId(paper.id);
                        }}
                        title="클릭하여 메모 수정"
                      >
                        📝 {memo}
                      </p>
                    )
                  )}
                </div>

                {/* Actions */}
                <div className="item-actions" onClick={(e) => e.stopPropagation()}>
                  {sortMode === "manual" && (
                    <div className="reorder-buttons">
                      <button
                        onClick={() => onMoveItem(index, -1)}
                        disabled={index === 0}
                        title="위로 이동"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        onClick={() => onMoveItem(index, 1)}
                        disabled={index === cueSheet.length - 1}
                        title="아래로 이동"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  )}
                  <button
                    className={`btn-memo ${memo ? "has-memo" : ""}`}
                    onClick={() => setMemoEditingId(isMemoEditing ? null : paper.id)}
                    title={memo ? "메모 수정" : "메모 추가"}
                  >
                    <StickyNote size={13} />
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => onRemoveFromCueSheet(paper.id)}
                    title="큐시트에서 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Seed-relative recommendations (FR-1.3) */}
      <div className="recommend-section">
        <div className="recommend-header">
          <Wand2 size={13} className="icon-purple" />
          <h3>추천 논문 (시드 기준)</h3>
          <span className="count-badge">{recommendations.length}</span>
        </div>
        {recommendations.length === 0 ? (
          <p className="recommend-empty">추천할 논문이 없습니다. 시드를 바꾸거나 새 논문을 검색해 보세요.</p>
        ) : (
          <div className="recommend-list">
            {recommendations.map(({ paper, score }) => (
              <div key={paper.id} className="recommend-item" onClick={() => onSelectPaper(paper)}>
                <div className="recommend-info">
                  <p className="recommend-title">{paper.title}</p>
                  <div className="recommend-meta">
                    <span>{paper.year} · {paper.venue}</span>
                    <span className="score-badge">관련도 {Math.round(score * 100)}%</span>
                  </div>
                </div>
                <button
                  className="btn-add-rec"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddRecommended(paper);
                  }}
                  title="큐시트에 추가"
                >
                  <Plus size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .cuesheet-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-radius: 12px;
          overflow: hidden;
        }
        
        .cuesheet-header {
          padding: 20px;
          border-bottom: 1px solid var(--border-color);
        }
        
        .title-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        
        .title-wrapper h2 {
          font-size: 1.15rem;
          color: var(--text-primary);
        }
        
        .count-badge {
          background: var(--accent-purple-glow);
          color: var(--accent-purple);
          border: 1px solid rgba(147, 51, 234, 0.3);
          border-radius: 20px;
          padding: 2px 8px;
          font-size: 0.75rem;
          font-weight: 700;
        }
        
        .icon-purple {
          color: var(--accent-purple);
        }
        
        .subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        
        .cuesheet-controls {
          padding: 12px 20px;
          background: rgba(0, 0, 0, 0.15);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        
        .select-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }
        
        .select-group label {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }
        
        .select-group select {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 0.75rem;
          outline: none;
          cursor: pointer;
          transition: var(--transition-fast);
        }
        
        .select-group select:focus {
          border-color: var(--accent-purple);
        }
        
        .export-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .export-group label {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.05em;
        }

        .export-buttons {
          display: flex;
          gap: 4px;
        }

        .btn-export {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 6px 8px;
          border-radius: 6px;
          font-size: 0.68rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: var(--transition-fast);
        }
        
        .btn-export:hover:not(:disabled) {
          background: var(--accent-purple-glow);
          border-color: var(--accent-purple);
          color: var(--text-primary);
        }
        
        .btn-export:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .btn-share.copied {
          border-color: rgba(34, 197, 94, 0.5);
          color: #22c55e;
          background: rgba(34, 197, 94, 0.08);
        }
        
        .cuesheet-list {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          height: 100%;
          color: var(--text-muted);
          padding: 20px;
        }
        
        .empty-state p {
          font-size: 0.85rem;
          font-weight: 500;
        }
        
        .empty-state .detail {
          font-size: 0.75rem;
          margin-top: 6px;
          opacity: 0.7;
        }
        
        .cuesheet-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: var(--transition-smooth);
          position: relative;
        }
        
        .cuesheet-item:hover {
          background: rgba(255, 255, 255, 0.04);
          border-color: rgba(147, 51, 234, 0.2);
          transform: translateX(2px);
        }
        
        .cuesheet-item.active {
          background: rgba(147, 51, 234, 0.06);
          border-color: rgba(147, 51, 234, 0.4);
          box-shadow: 0 0 15px rgba(147, 51, 234, 0.05);
        }
        
        .item-index-badge {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 6px;
          min-width: 44px;
          height: 44px;
          border: 1px solid var(--border-color);
        }
        
        .item-index-badge span {
          font-size: 0.55rem;
          color: var(--text-muted);
          font-weight: 700;
          letter-spacing: 0.05em;
        }
        
        .item-index-badge strong {
          font-size: 0.95rem;
          color: var(--accent-purple);
          font-family: var(--font-display);
        }
        
        .cuesheet-item.active .item-index-badge strong {
          color: var(--text-primary);
          background: var(--accent-purple);
          width: 100%;
          text-align: center;
          border-radius: 0 0 5px 5px;
        }
        
        .cuesheet-item.active .item-index-badge {
          border-color: var(--accent-purple);
        }
        
        .item-content {
          flex: 1;
          min-width: 0;
        }
        
        .item-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 4px;
        }
        
        .item-year {
          font-size: 0.7rem;
          color: var(--text-muted);
        }
        
        .item-title {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.3;
          margin-bottom: 6px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .item-rationale {
          font-size: 0.72rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }
        
        .item-actions {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: flex-end;
        }
        
        .btn-delete {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: var(--transition-fast);
        }
        
        .btn-delete:hover {
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }
        
        .reorder-buttons {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .reorder-buttons button {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          border-radius: 3px;
          cursor: pointer;
          width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .reorder-buttons button:hover:not(:disabled) {
          color: var(--text-primary);
          border-color: var(--text-secondary);
        }
        
        .reorder-buttons button:disabled {
          opacity: 0.2;
          cursor: not-allowed;
        }

        .dnd-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 20px;
          font-size: 0.7rem;
          color: var(--accent-purple);
          background: rgba(147, 51, 234, 0.05);
          border-bottom: 1px solid var(--border-color);
        }

        .cuesheet-item.drag-over {
          border-color: var(--accent-purple);
          box-shadow: 0 0 12px rgba(147, 51, 234, 0.25);
        }

        .cuesheet-item[draggable="true"] {
          cursor: grab;
        }

        .drag-handle {
          display: flex;
          align-items: center;
          color: var(--text-muted);
          margin-right: -6px;
        }

        .btn-memo {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: var(--transition-fast);
        }

        .btn-memo:hover {
          color: var(--accent-purple);
          background: rgba(147, 51, 234, 0.1);
        }

        .btn-memo.has-memo {
          color: var(--accent-purple);
        }

        .item-memo {
          margin-top: 6px;
          font-size: 0.7rem;
          line-height: 1.4;
          color: var(--text-secondary);
          background: rgba(147, 51, 234, 0.06);
          border-left: 2px solid var(--accent-purple);
          border-radius: 0 4px 4px 0;
          padding: 5px 8px;
          cursor: text;
          white-space: pre-wrap;
        }

        .memo-editor {
          margin-top: 6px;
        }

        .memo-editor textarea {
          width: 100%;
          min-height: 52px;
          resize: vertical;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--accent-purple);
          border-radius: 6px;
          color: var(--text-primary);
          font-size: 0.72rem;
          font-family: inherit;
          line-height: 1.4;
          padding: 6px 8px;
          outline: none;
        }

        .memo-help {
          margin-top: 3px;
          font-size: 0.6rem;
          color: var(--text-muted);
        }

        .recommend-section {
          border-top: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.12);
          padding: 12px 15px;
          max-height: 32%;
          overflow-y: auto;
          flex-shrink: 0;
        }

        .recommend-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }

        .recommend-header h3 {
          font-size: 0.78rem;
          color: var(--text-primary);
        }

        .recommend-empty {
          font-size: 0.7rem;
          color: var(--text-muted);
          padding: 4px 0 2px;
        }

        .recommend-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .recommend-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 7px 9px;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .recommend-item:hover {
          border-color: rgba(147, 51, 234, 0.3);
          background: rgba(147, 51, 234, 0.04);
        }

        .recommend-info {
          min-width: 0;
        }

        .recommend-title {
          font-size: 0.72rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .recommend-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.62rem;
          color: var(--text-muted);
          margin-top: 2px;
        }

        .score-badge {
          color: var(--accent-purple);
          font-weight: 700;
        }

        .btn-add-rec {
          flex-shrink: 0;
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(147, 51, 234, 0.12);
          border: 1px solid rgba(147, 51, 234, 0.35);
          color: var(--accent-purple);
          border-radius: 5px;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .btn-add-rec:hover {
          background: var(--accent-purple);
          color: white;
        }
      `}</style>
    </div>
  );
}
