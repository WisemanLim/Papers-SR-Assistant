import React, { useState, useEffect, useRef } from "react";
import { Sparkles, MessageSquare, Send, Globe, AlertCircle, FileText, CheckCircle, Bot, Loader2 } from "lucide-react";
import { detectProvider, askLLM, buildPaperSystemPrompt } from "../api/llm";

// KaTeX inline/block renderer
function Latex({ math, block = false }) {
  const containerRef = useRef(null);
  
  useEffect(() => {
    if (containerRef.current && window.katex) {
      try {
        window.katex.render(math, containerRef.current, {
          displayMode: block,
          throwOnError: false
        });
      } catch (err) {
        containerRef.current.textContent = math;
      }
    } else if (containerRef.current) {
      containerRef.current.textContent = math;
    }
  }, [math, block]);

  return <span ref={containerRef} />;
}

export default function DetailPanel({
  paper,
  onAddToCueSheet,
  isInCueSheet,
  onUpdateTldr,
  onOpenPdf
}) {
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState("");
  const [activeTab, setActiveTab] = useState("info"); // 'info' or 'chat'
  const [showEquationExplain, setShowEquationExplain] = useState(null);
  const [provider, setProvider] = useState(null); // {kind, label, model?}
  const [thinking, setThinking] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const chatEndRef = useRef(null);

  // Detect the LLM provider once (Gemini → Ollama → simulator)
  useEffect(() => {
    let alive = true;
    detectProvider().then((p) => {
      if (alive) setProvider(p);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Initialize chat history when selected paper changes
  useEffect(() => {
    if (!paper) return;
    setMessages([
      {
        sender: "ai",
        text: `안녕하세요! **"${paper.title}"** 논문에 대해 궁금한 점을 질문해 주세요. 모델 구조, 실험 결과, 수식에 대한 자세한 해설을 제공해 드립니다.`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setShowEquationExplain(null);
  }, [paper]);

  // Scroll to bottom of chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  if (!paper) {
    return (
      <div className="detail-panel glass empty">
        <FileText size={36} style={{ opacity: 0.3, marginBottom: "15px" }} />
        <h3>논문이 선택되지 않았습니다</h3>
        <p>왼쪽 큐시트 리스트나 중앙 인용 네트워크 그래프에서 분석할 논문을 클릭해 주세요.</p>
      </div>
    );
  }

  // Pre-coded intelligent simulated answers for commonly asked questions based on paper context
  const getSimulatedAnswer = (query) => {
    const q = query.toLowerCase();
    
    // Core Paper context helper
    const id = paper.id;

    if (q.includes("기여") || q.includes("공헌") || q.includes("contribution") || q.includes("왜")) {
      return `**"${paper.title}"**의 핵심 기여는 다음과 같습니다:\n\n${paper.keyContribution}\n\n이 연구를 통해 기존 방법론 대비 연산 병렬성을 확보하고 성능을 대폭 끌어올렸습니다.`;
    }
    
    if (q.includes("한계") || q.includes("단점") || q.includes("limit") || q.includes("아쉬운")) {
      return `**"${paper.title}"** 연구의 주요 한계점은 다음과 같습니다:\n\n${paper.limitations}\n\n이러한 단점을 극복하기 위해 후속 연구들이 파생되었습니다.`;
    }
    
    if (q.includes("데이터") || q.includes("학습") || q.includes("dataset")) {
      return `본 논문은 **${paper.dataset}** 데이터셋을 활용해 학습 및 평가를 진행했습니다.`;
    }

    if (q.includes("성능") || q.includes("결과") || q.includes("metric") || q.includes("점수")) {
      return `실험 결과, 주요 평가지표 기준 **${paper.metrics}** 성능을 달성하여 SOTA(State-of-the-Art) 또는 이에 준하는 경쟁력을 확인했습니다.`;
    }

    // Specific Paper details
    if (id === "transformer_2017") {
      if (q.includes("수식") || q.includes("어텐션") || q.includes("attention")) {
        return `트랜스포머의 어텐션 메커니즘은 다음과 같습니다:\n\n$$Attention(Q, K, V) = softmax(\\frac{QK^T}{\\sqrt{d_k}})V$$\n\n여기서 $Q$는 쿼리, $K$는 키, $V$는 밸류입니다. $\\sqrt{d_k}$로 나누어주는 스케일링을 통해 내적(dot-product) 값이 너무 커져 소프트맥스 그라디언트가 소실되는 것을 방지합니다.`;
      }
      if (q.includes("rnn") || q.includes("순환")) {
        return `기존 RNN 계열 모델은 토큰을 순차적으로 처리해야 하므로 병렬화가 불가능했습니다. Transformer는 시퀀스 전체를 한 번에 입력하여 셀프 어텐션을 수행하므로, GPU 하드웨어 가속을 활용한 대규모 병렬 연산이 가능해진 것이 RNN을 완전히 대체하게 된 배경입니다.`;
      }
    }

    if (id === "vit_2020") {
      if (q.includes("패치") || q.includes("patch") || q.includes("이미지")) {
        return `ViT는 이미지를 $16 \\times 16$ 크기의 패치로 쪼개어 각 패치를 하나의 벡터로 평탄화(flatten)합니다. 이후 리니어 프로젝션 및 위치 임베딩을 더해 마치 NLP의 '단어 토큰'처럼 트랜스포머 인코더에 입력합니다. 수식은 다음과 같이 표시됩니다:\n\n$$z_0 = [x_{class}; x_p^1 E; x_p^2 E; ...; x_p^N E] + E_{pos}$$`;
      }
      if (q.includes("귀납") || q.includes("inductive bias") || q.includes("편향")) {
        return `CNN은 로컬 커널 연산을 통해 이미지의 지역적 구조(Locality)와 평행이동 불변성(Translation Invariance)을 내장하고 있습니다(귀납적 편향). 반면, ViT는 이미지 패치 전체를 어텐션하므로 지역 정보에 대한 사전 지식이 없습니다. 따라서 엄청난 양의 데이터(예: JFT-300M)로 사전 학습해야만 이 귀납적 편향을 데이터로부터 스스로 학습할 수 있다는 단점이 있습니다.`;
      }
    }

    if (id === "swin_2021") {
      if (q.includes("윈도우") || q.includes("window") || q.includes("shifted")) {
        return `Swin Transformer는 이미지를 고정된 $M \\times M$ 크기의 로컬 윈도우로 나눈 뒤, 그 윈도우 내부에서만 어텐션을 수행하여 $O(N)$의 선형 시간 복잡도를 얻습니다. 그리고 다음 레이어에서는 이 윈도우를 사선 방향으로 약간 이동(Shifted Window)시켜 윈도우 경계를 넘는 정보 연결을 제공합니다. 이 메커니즘을 통해 연산 속도와 이미지 전역 정보 교환을 동시에 챙겼습니다.`;
      }
    }

    // Default Fallback intelligent answer
    return `질문하신 내용에 대해 논문을 기초로 답변해 드립니다:\n\n본 연구 **"${paper.title}"**(${paper.year}, ${paper.venue})는 **${paper.category}** 영역에서 중요하게 다뤄지는 연구입니다. ${paper.tldr} \n\n보다 자세한 내용을 원하신다면 수식이나 기여점 탭을 눌러 보시거나 구체적인 모델 아키텍처 구성을 물어보시면 상세히 안내해 드리겠습니다.`;
  };

  const pushAiMessage = (text) => {
    setMessages((prev) => [
      ...prev,
      { sender: "ai", text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }
    ]);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() || thinking) return;

    const userMsg = {
      sender: "user",
      text: inputVal,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal("");

    // Real LLM (Gemini/Ollama) when available; simulator otherwise (PRD Phase 2)
    if (provider && provider.kind !== "simulator") {
      setThinking(true);
      try {
        const answer = await askLLM(userMsg.text, { system: buildPaperSystemPrompt(paper) });
        pushAiMessage(answer);
      } catch (err) {
        pushAiMessage(`⚠️ LLM 호출 실패(${err.message}) — 규칙 기반 응답으로 대체합니다.\n\n${getSimulatedAnswer(userMsg.text)}`);
      } finally {
        setThinking(false);
      }
      return;
    }

    // Simulate AI response delay
    setTimeout(() => {
      pushAiMessage(getSimulatedAnswer(userMsg.text));
    }, 600);
  };

  // Generate a Korean TL;DR for externally added papers (FR-4.2)
  const handleGenerateTldr = async () => {
    if (!provider || provider.kind === "simulator" || summarizing) return;
    setSummarizing(true);
    try {
      const summary = await askLLM(
        "이 논문의 핵심을 한국어 한 문장(TL;DR)으로 요약해 주세요. 문장만 출력하세요.",
        { system: buildPaperSystemPrompt(paper) }
      );
      onUpdateTldr(paper.id, summary.trim());
    } catch {
      // Summary is best-effort; existing tldr stays
    } finally {
      setSummarizing(false);
    }
  };

  const formatTextForMarkdown = (text) => {
    // Basic Markdown Parser (bold, inline code, lists)
    let formatted = text;
    
    // Bold **text**
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    
    // Line breaks
    formatted = formatted.replace(/\n/g, "<br />");
    
    // Process LaTeX in response
    const parts = [];
    let lastIndex = 0;
    
    // Detect $$ block LaTeX and $ inline LaTeX
    const regex = /(\$\$(.*?)\$\$)|(\$(.*?)\$)/g;
    let match;
    
    while ((match = regex.exec(formatted)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(<span key={lastIndex} dangerouslySetInnerHTML={{ __html: formatted.substring(lastIndex, match.index) }} />);
      }
      
      const isBlock = !!match[1];
      const formula = isBlock ? match[2] : match[4];
      parts.push(<Latex key={match.index} math={formula} block={isBlock} />);
      
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < formatted.length) {
      parts.push(<span key={lastIndex} dangerouslySetInnerHTML={{ __html: formatted.substring(lastIndex) }} />);
    }
    
    return parts.length > 0 ? parts : formatted;
  };

  return (
    <div className="detail-panel glass">
      {/* Upper Tab Menu */}
      <div className="panel-tabs">
        <button
          className={activeTab === "info" ? "active" : ""}
          onClick={() => setActiveTab("info")}
        >
          <FileText size={14} />
          <span>논문 상세</span>
        </button>
        <button
          className={activeTab === "chat" ? "active" : ""}
          onClick={() => setActiveTab("chat")}
        >
          <MessageSquare size={14} />
          <span>AI 질의응답</span>
        </button>
      </div>

      {/* Action Bar */}
      <div className="panel-actions">
        <button
          className={`btn-add-cue ${isInCueSheet ? "in-cuesheet" : ""}`}
          onClick={() => onAddToCueSheet(paper)}
        >
          {isInCueSheet ? (
            <>
              <CheckCircle size={15} />
              <span>큐시트에 담김</span>
            </>
          ) : (
            <>
              <Sparkles size={15} />
              <span>읽기 큐시트에 추가</span>
            </>
          )}
        </button>
        <button className="btn-pdf-link btn-pdf-view" onClick={onOpenPdf} title="앱 내 PDF 뷰어 (드래그 → AI 해설)">
          <span>PDF 뷰어</span>
        </button>
        <a
          href={paper.pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-pdf-link"
        >
          <span>원문 ↗</span>
        </a>
      </div>

      {/* Content Area */}
      <div className="panel-content-scroll">
        {activeTab === "info" ? (
          <div className="tab-info animate-fade-in">
            {/* Header info */}
            <div className="paper-info-header">
              <span className={`badge ${
                paper.category === "Core" ? "badge-purple" : 
                paper.category === "NLP" ? "badge-blue" : "badge-cyan"
              }`}>{paper.category}</span>
              <h2>{paper.title}</h2>
              <p className="authors">{paper.authors}</p>
              <div className="metrics-row">
                <span>학회: <strong>{paper.venue} ({paper.year})</strong></span>
                <span>피인용 수: <strong>{paper.citations.toLocaleString()}</strong></span>
              </div>
            </div>

            {/* TLDR Summary */}
            <div className="info-section">
              <div className="section-title">
                <Globe size={14} className="icon-blue" />
                <h3>AI 1줄 요약 (국문)</h3>
                {paper.isExternal && provider && provider.kind !== "simulator" && (
                  <button className="btn-gen-tldr" onClick={handleGenerateTldr} disabled={summarizing}>
                    {summarizing ? <Loader2 size={11} className="spin-icon" /> : <Sparkles size={11} />}
                    <span>{summarizing ? "생성 중…" : "AI 한글 요약 생성"}</span>
                  </button>
                )}
              </div>
              <p className="section-body tldr-box">{paper.tldr}</p>
            </div>

            {/* Structured Table */}
            <div className="info-section">
              <h3>핵심 요약 테이블</h3>
              <table className="meta-table">
                <tbody>
                  <tr>
                    <th>핵심 기여</th>
                    <td>{paper.keyContribution}</td>
                  </tr>
                  <tr>
                    <th>학습 데이터</th>
                    <td>{paper.dataset}</td>
                  </tr>
                  <tr>
                    <th>평가지표 & 성능</th>
                    <td>{paper.metrics}</td>
                  </tr>
                  <tr>
                    <th>한계점</th>
                    <td>{paper.limitations}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Equations Section */}
            {paper.equations && paper.equations.length > 0 && (
              <div className="info-section">
                <h3>주요 수식 해설 (클릭 시 설명)</h3>
                <div className="equation-list">
                  {paper.equations.map((eq, idx) => (
                    <div 
                      key={idx} 
                      className={`equation-card ${showEquationExplain === idx ? "expanded" : ""}`}
                      onClick={() => setShowEquationExplain(showEquationExplain === idx ? null : idx)}
                    >
                      <div className="equation-header">
                        <h4>{eq.name}</h4>
                        <span className="expand-indicator">
                          {showEquationExplain === idx ? "닫기" : "설명보기"}
                        </span>
                      </div>
                      <div className="equation-math">
                        <Latex math={eq.latex} block={true} />
                      </div>
                      {showEquationExplain === idx && (
                        <div className="equation-explain-body animate-fade-in">
                          <AlertCircle size={13} className="info-icon" />
                          <p>{eq.description}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Chat UI */
          <div className="tab-chat animate-fade-in">
            <div className="chat-provider-line">
              <Bot size={12} />
              <span>응답 엔진: <strong>{provider ? provider.label : "감지 중…"}</strong></span>
            </div>
            <div className="chat-history">
              {messages.map((msg, idx) => (
                <div key={idx} className={`chat-bubble-wrapper ${msg.sender}`}>
                  <div className="chat-bubble">
                    <p className="bubble-text">{formatTextForMarkdown(msg.text)}</p>
                  </div>
                  <span className="bubble-time">{msg.time}</span>
                </div>
              ))}
              {thinking && (
                <div className="chat-bubble-wrapper ai">
                  <div className="chat-bubble thinking">
                    <Loader2 size={13} className="spin-icon" />
                    <span>응답을 생성하는 중…</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-bar">
              <input
                type="text"
                placeholder="수식, 한계점, 기여점에 대해 질문해 보세요..."
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                disabled={thinking}
              />
              <button type="submit" className="btn-send" disabled={thinking}>
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>

      <style>{`
        .detail-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          border-radius: 12px;
          overflow: hidden;
        }
        
        .detail-panel.empty {
          align-items: center;
          justify-content: center;
          padding: 30px;
          text-align: center;
          color: var(--text-muted);
        }
        
        .detail-panel.empty h3 {
          font-size: 1rem;
          color: var(--text-primary);
          margin-bottom: 6px;
        }
        
        .detail-panel.empty p {
          font-size: 0.78rem;
          line-height: 1.4;
        }
        
        .panel-tabs {
          display: flex;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid var(--border-color);
        }
        
        .panel-tabs button {
          flex: 1;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-secondary);
          padding: 14px;
          font-size: 0.82rem;
          font-family: var(--font-display);
          cursor: pointer;
          transition: var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        
        .panel-tabs button:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.02);
        }
        
        .panel-tabs button.active {
          color: var(--accent-purple);
          border-bottom-color: var(--accent-purple);
          background: rgba(147, 51, 234, 0.04);
        }
        
        .panel-actions {
          padding: 15px 20px;
          display: flex;
          gap: 10px;
          border-bottom: 1px solid var(--border-color);
        }
        
        .btn-add-cue {
          flex: 1;
          background: linear-gradient(135deg, var(--accent-purple), var(--accent-blue));
          color: white;
          border: none;
          padding: 10px;
          border-radius: 6px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: var(--transition-smooth);
        }
        
        .btn-add-cue.in-cuesheet {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
        }
        
        .btn-add-cue:hover:not(.in-cuesheet) {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        
        .btn-pdf-link {
          background: transparent;
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          padding: 10px 14px;
          border-radius: 6px;
          font-size: 0.78rem;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }
        
        .btn-pdf-link:hover {
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-primary);
          border-color: var(--text-secondary);
        }

        .btn-pdf-view {
          cursor: pointer;
          font-family: inherit;
        }

        .btn-pdf-view:hover {
          border-color: var(--accent-purple);
          color: var(--accent-purple);
        }
        
        .panel-content-scroll {
          flex: 1;
          overflow-y: auto;
        }
        
        .tab-info {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .paper-info-header {
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 15px;
        }
        
        .paper-info-header h2 {
          font-size: 1.15rem;
          line-height: 1.35;
          margin-top: 8px;
          margin-bottom: 6px;
          color: var(--text-primary);
        }
        
        .paper-info-header .authors {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin-bottom: 10px;
        }
        
        .metrics-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.72rem;
          color: var(--text-muted);
        }
        
        .metrics-row strong {
          color: var(--text-secondary);
        }
        
        .info-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        
        .info-section h3 {
          font-size: 0.85rem;
          color: var(--text-primary);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .section-title h3 {
          font-size: 0.85rem;
          color: var(--accent-blue);
        }
        
        .tldr-box {
          background: rgba(37, 99, 235, 0.04);
          border: 1px dashed rgba(37, 99, 235, 0.2);
          border-radius: 8px;
          padding: 12px;
          font-size: 0.8rem;
          line-height: 1.45;
          color: var(--text-secondary);
        }
        
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.75rem;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          overflow: hidden;
        }
        
        .meta-table th, .meta-table td {
          padding: 10px 12px;
          text-align: left;
          line-height: 1.45;
        }
        
        .meta-table th {
          background: rgba(255, 255, 255, 0.02);
          color: var(--text-secondary);
          width: 90px;
          font-weight: 600;
          border-right: 1px solid var(--border-color);
          vertical-align: top;
        }
        
        .meta-table td {
          color: var(--text-secondary);
          background: rgba(255, 255, 255, 0.005);
        }
        
        .meta-table tr:not(:last-child) {
          border-bottom: 1px solid var(--border-color);
        }
        
        .equation-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .equation-card {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        
        .equation-card:hover {
          background: rgba(255, 255, 255, 0.02);
          border-color: rgba(147, 51, 234, 0.2);
        }
        
        .equation-card.expanded {
          border-color: var(--accent-purple);
          background: rgba(147, 51, 234, 0.02);
        }
        
        .equation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        
        .equation-header h4 {
          font-size: 0.78rem;
          color: var(--text-primary);
        }
        
        .expand-indicator {
          font-size: 0.65rem;
          color: var(--text-muted);
          font-weight: 500;
        }
        
        .equation-card:hover .expand-indicator {
          color: var(--accent-purple);
        }
        
        .equation-math {
          background: rgba(0, 0, 0, 0.15);
          padding: 10px;
          border-radius: 6px;
          overflow-x: auto;
          display: flex;
          justify-content: center;
        }
        
        .equation-explain-body {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          display: flex;
          gap: 6px;
          color: var(--accent-purple);
          font-size: 0.72rem;
          line-height: 1.45;
        }
        
        .equation-explain-body p {
          color: var(--text-secondary);
        }
        
        .info-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }
        
        .btn-gen-tldr {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(37, 99, 235, 0.08);
          border: 1px solid rgba(37, 99, 235, 0.3);
          color: var(--accent-blue);
          padding: 3px 8px;
          border-radius: 5px;
          font-size: 0.62rem;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-fast);
        }

        .btn-gen-tldr:hover:not(:disabled) {
          background: var(--accent-blue);
          color: white;
        }

        .btn-gen-tldr:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .spin-icon {
          animation: llm-spin 0.9s linear infinite;
        }

        @keyframes llm-spin {
          to { transform: rotate(360deg); }
        }

        .chat-provider-line {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 15px;
          font-size: 0.68rem;
          color: var(--text-muted);
          background: rgba(0, 0, 0, 0.15);
          border-bottom: 1px solid var(--border-color);
        }

        .chat-provider-line strong {
          color: var(--accent-purple);
        }

        .chat-bubble.thinking {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          font-size: 0.75rem;
        }

        /* Chat UI Styles */
        .tab-chat {
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
        }
        
        .chat-history {
          flex: 1;
          overflow-y: auto;
          padding: 15px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: rgba(0, 0, 0, 0.1);
          height: calc(100vh - 170px); /* Adjust height to fit container */
        }
        
        .chat-bubble-wrapper {
          display: flex;
          flex-direction: column;
          max-width: 80%;
        }
        
        .chat-bubble-wrapper.ai {
          align-self: flex-start;
          align-items: flex-start;
        }
        
        .chat-bubble-wrapper.user {
          align-self: flex-end;
          align-items: flex-end;
        }
        
        .chat-bubble {
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 0.78rem;
          line-height: 1.5;
        }
        
        .ai .chat-bubble {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          border-top-left-radius: 2px;
        }
        
        .user .chat-bubble {
          background: var(--accent-purple);
          color: white;
          border-top-right-radius: 2px;
        }
        
        .bubble-time {
          font-size: 0.6rem;
          color: var(--text-muted);
          margin-top: 4px;
          padding: 0 4px;
        }
        
        .bubble-text strong {
          color: var(--text-primary);
        }
        
        .bubble-text br {
          margin-bottom: 6px;
        }
        
        .chat-input-bar {
          padding: 12px 15px;
          border-top: 1px solid var(--border-color);
          background: var(--bg-secondary);
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .chat-input-bar input {
          flex: 1;
          background: var(--bg-primary);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          outline: none;
          transition: var(--transition-fast);
        }
        
        .chat-input-bar input:focus {
          border-color: var(--accent-purple);
          box-shadow: 0 0 8px rgba(147, 51, 234, 0.15);
        }
        
        .btn-send {
          width: 32px;
          height: 32px;
          background: var(--accent-purple);
          border: none;
          color: white;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition-fast);
        }
        
        .btn-send:hover {
          filter: brightness(1.1);
        }
      `}</style>
    </div>
  );
}
