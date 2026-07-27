import React, { useEffect, useRef } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";

// Monkey-patch vis-network Network.prototype methods to prevent crashes on destroyed instances
if (Network && Network.prototype) {
  const originalFit = Network.prototype.fit;
  Network.prototype.fit = function(...args) {
    if (!this.view) return; // Silent fallback if destroyed
    return originalFit.apply(this, args);
  };
  
  const originalMoveTo = Network.prototype.moveTo;
  Network.prototype.moveTo = function(...args) {
    if (!this.view) return;
    return originalMoveTo.apply(this, args);
  };

  const originalGetScale = Network.prototype.getScale;
  Network.prototype.getScale = function(...args) {
    if (!this.view) return 1;
    return originalGetScale.apply(this, args);
  };
}

export default function GraphView({
  papers,
  selectedPaper,
  onSelectPaper,
  seedPapers,
  onToggleSeed
}) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodesRef = useRef(null);
  const edgesRef = useRef(null);

  // Dynamic timeline range derived from the current paper set
  const years = papers.map((p) => p.year);
  const minYear = years.length > 0 ? Math.min(...years) : 2017;
  const maxYear = years.length > 0 ? Math.max(...years) : 2021;
  const yearSpan = Math.max(1, maxYear - minYear);

  // Effect 1: Initialize Network once when papers list changes
  useEffect(() => {
    if (!containerRef.current) return;

    // Group papers by year to compute Y positions dynamically
    const papersByYear = {};
    papers.forEach((paper) => {
      if (!papersByYear[paper.year]) {
        papersByYear[paper.year] = [];
      }
      papersByYear[paper.year].push(paper);
    });

    // Create Nodes data array
    const nodesArray = papers.map((paper) => {
      const yearPapers = papersByYear[paper.year];
      const index = yearPapers.indexOf(paper);
      const count = yearPapers.length;

      // X-coordinate based on Year (chronological timeline, dynamic range)
      const x = (paper.year - minYear) * 240 - 360;
      
      // Y-coordinate distributed vertically to avoid overlap
      const y = (index - (count - 1) / 2) * 130;

      const isSelected = selectedPaper && selectedPaper.id === paper.id;
      const isSeed = seedPapers.includes(paper.id);

      // Node styling: default color maps publication year to hue (FR-2.1)
      const yearHue = 200 + ((paper.year - minYear) / yearSpan) * 80;
      let backgroundColor = `hsla(${yearHue}, 40%, 26%, 0.85)`;
      let borderColor = `hsla(${yearHue}, 55%, 55%, 0.55)`;
      let borderWidth = 1;

      if (isSelected) {
        backgroundColor = "rgba(147, 51, 234, 0.25)";
        borderColor = "hsl(270, 80%, 65%)";
        borderWidth = 3;
      } else if (isSeed) {
        backgroundColor = "rgba(37, 99, 235, 0.25)";
        borderColor = "hsl(210, 85%, 60%)";
        borderWidth = 2.5;
      }

      const size = Math.max(22, Math.min(48, 15 + Math.log(paper.citations) * 3));
      const shortTitle = paper.title.length > 25 ? paper.title.substring(0, 22) + "..." : paper.title;
      const label = `${shortTitle}\n(${paper.year})`;

      return {
        id: paper.id,
        label,
        x,
        y,
        size,
        shape: "dot",
        color: {
          background: backgroundColor,
          border: borderColor,
          highlight: {
            background: "rgba(147, 51, 234, 0.4)",
            border: "hsl(270, 80%, 75%)"
          },
          hover: {
            background: "rgba(255, 255, 255, 0.1)",
            border: "rgba(255, 255, 255, 0.4)"
          }
        },
        font: {
          color: isSelected ? "hsl(270, 80%, 85%)" : "rgba(255, 255, 255, 0.85)",
          size: 11,
          face: "Outfit, Inter, sans-serif",
          bold: isSelected ? "bold" : "normal",
          vadjust: 3
        },
        borderWidth,
        shadow: isSelected || isSeed ? { enabled: true, color: isSelected ? "rgba(147, 51, 234, 0.5)" : "rgba(37, 99, 235, 0.4)", size: 10, x: 0, y: 0 } : false
      };
    });

    // Create Edges data array
    const edgesArray = [];
    papers.forEach((paper) => {
      if (paper.references && paper.references.length > 0) {
        paper.references.forEach((refId) => {
          const targetExists = papers.some((p) => p.id === refId);
          if (targetExists) {
            const isSelectedRef = selectedPaper && (selectedPaper.id === paper.id || selectedPaper.id === refId);
            
            edgesArray.push({
              id: `${refId}-${paper.id}`,
              from: refId,
              to: paper.id,
              arrows: "to",
              color: {
                color: isSelectedRef ? "rgba(147, 51, 234, 0.7)" : "rgba(255, 255, 255, 0.08)",
                highlight: "rgba(147, 51, 234, 0.9)",
                hover: "rgba(255, 255, 255, 0.3)"
              },
              width: isSelectedRef ? 2.5 : 1,
              smooth: {
                type: "curvedCCW",
                roundness: 0.15
              }
            });
          }
        });
      }
    });

    const nodesDataSet = new DataSet(nodesArray);
    const edgesDataSet = new DataSet(edgesArray);

    nodesRef.current = nodesDataSet;
    edgesRef.current = edgesDataSet;

    const data = { nodes: nodesDataSet, edges: edgesDataSet };

    const options = {
      nodes: {
        scaling: {
          min: 16,
          max: 40
        }
      },
      edges: {
        arrows: {
          to: { enabled: true, scaleFactor: 0.8 }
        },
        selectionWidth: 2
      },
      physics: {
        enabled: false // Static fixed timeline representation
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        dragNodes: true,
        zoomView: true,
        dragView: true
      }
    };

    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    // Selection Event (Deferred to prevent synchronous destruction crash)
    network.on("selectNode", (params) => {
      const nodeId = params.nodes[0];
      const clickedPaper = papers.find((p) => p.id === nodeId);
      if (clickedPaper) {
        setTimeout(() => {
          onSelectPaper(clickedPaper);
        }, 0);
      }
    });

    // Double Click to toggle seed status
    network.on("doubleClick", (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        setTimeout(() => {
          onToggleSeed(nodeId);
        }, 0);
      }
    });

    // Fit view after first draw settles, avoiding rendering timing crashes
    network.once("afterDrawing", () => {
      if (networkRef.current && networkRef.current.view) {
        try {
          networkRef.current.fit({
            animation: {
              duration: 800,
              easingFunction: "easeOutQuad"
            }
          });
        } catch (e) {
          console.warn("Network fit error:", e);
        }
      }
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
      nodesRef.current = null;
      edgesRef.current = null;
    };
  }, [papers]); // Only reinitialize when the papers set changes (e.g. category filter or search)

  // Effect 2: Update existing nodes & edges styling on selectedPaper or seedPapers changes
  useEffect(() => {
    if (!networkRef.current || !nodesRef.current || !edgesRef.current) return;

    const nodesDataSet = nodesRef.current;
    const edgesDataSet = edgesRef.current;

    // Update nodes properties in the active dataset
    papers.forEach((paper) => {
      const isSelected = selectedPaper && selectedPaper.id === paper.id;
      const isSeed = seedPapers.includes(paper.id);

      // Same year-hue default as initial render (FR-2.1)
      const yearHue = 200 + ((paper.year - minYear) / yearSpan) * 80;
      let backgroundColor = `hsla(${yearHue}, 40%, 26%, 0.85)`;
      let borderColor = `hsla(${yearHue}, 55%, 55%, 0.55)`;
      let borderWidth = 1;

      if (isSelected) {
        backgroundColor = "rgba(147, 51, 234, 0.25)";
        borderColor = "hsl(270, 80%, 65%)";
        borderWidth = 3;
      } else if (isSeed) {
        backgroundColor = "rgba(37, 99, 235, 0.25)";
        borderColor = "hsl(210, 85%, 60%)";
        borderWidth = 2.5;
      }

      nodesDataSet.update({
        id: paper.id,
        borderWidth,
        color: {
          background: backgroundColor,
          border: borderColor
        },
        font: {
          color: isSelected ? "hsl(270, 80%, 85%)" : "rgba(255, 255, 255, 0.85)",
          bold: isSelected ? "bold" : "normal"
        },
        shadow: isSelected || isSeed ? { enabled: true, color: isSelected ? "rgba(147, 51, 234, 0.5)" : "rgba(37, 99, 235, 0.4)", size: 10, x: 0, y: 0 } : false
      });
    });

    // Update edges properties (highlighting connections related to selected paper)
    papers.forEach((paper) => {
      if (paper.references && paper.references.length > 0) {
        paper.references.forEach((refId) => {
          const edgeId = `${refId}-${paper.id}`;
          const isSelectedRef = selectedPaper && (selectedPaper.id === paper.id || selectedPaper.id === refId);
          
          if (edgesDataSet.get(edgeId)) {
            edgesDataSet.update({
              id: edgeId,
              color: {
                color: isSelectedRef ? "rgba(147, 51, 234, 0.7)" : "rgba(255, 255, 255, 0.08)",
                highlight: "rgba(147, 51, 234, 0.9)"
              },
              width: isSelectedRef ? 2.5 : 1
            });
          }
        });
      }
    });

    // Sync visual selection state if the selected paper is within the currently filtered set
    if (selectedPaper && papers.some((p) => p.id === selectedPaper.id)) {
      networkRef.current.selectNodes([selectedPaper.id]);
    } else {
      networkRef.current.unselectAll();
    }
  }, [selectedPaper, seedPapers, papers]);

  const handleZoomIn = () => {
    if (networkRef.current && networkRef.current.view) {
      const scale = networkRef.current.getScale();
      networkRef.current.moveTo({ scale: scale * 1.25, animation: true });
    }
  };

  const handleZoomOut = () => {
    if (networkRef.current && networkRef.current.view) {
      const scale = networkRef.current.getScale();
      networkRef.current.moveTo({ scale: scale * 0.8, animation: true });
    }
  };

  const handleRecenter = () => {
    if (networkRef.current && networkRef.current.view) {
      networkRef.current.fit({ animation: true });
    }
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Year markers behind the graph (dynamic range, at most ~8 labels) */}
      <div className="timeline-background">
        {(() => {
          const step = Math.max(1, Math.ceil(yearSpan / 8));
          const marks = [];
          for (let year = minYear; year <= maxYear; year += step) {
            marks.push(year);
          }
          return marks.map((year) => {
            const xPercent = ((year - minYear) / yearSpan) * 80 + 10;
            return (
              <div
                key={year}
                className="timeline-year-line"
                style={{ left: `${xPercent}%` }}
              >
                <span>{year}</span>
              </div>
            );
          });
        })()}
      </div>

      <div ref={containerRef} style={{ width: "100%", height: "100%", zIndex: 2, position: "relative" }} />

      {/* Float Controls */}
      <div className="graph-controls">
        <button onClick={handleZoomIn} title="확대">+</button>
        <button onClick={handleZoomOut} title="축소">-</button>
        <button onClick={handleRecenter} title="화면에 맞춤">⛶</button>
      </div>

      <style>{`
        .timeline-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: space-between;
          padding: 0 5%;
          pointer-events: none;
          z-index: 0;
        }
        
        .timeline-year-line {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.03) 100%);
          display: flex;
          justify-content: center;
        }
        
        .timeline-year-line span {
          position: absolute;
          bottom: 20px;
          font-family: var(--font-display);
          font-size: 0.8rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.15);
          letter-spacing: 0.05em;
          background-color: var(--bg-primary);
          padding: 2px 8px;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.03);
        }
        
        .graph-controls {
          position: absolute;
          bottom: 20px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 10;
        }
        
        .graph-controls button {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: rgba(15, 22, 36, 0.8);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          font-size: 1.1rem;
          font-family: var(--font-display);
          cursor: pointer;
          backdrop-filter: blur(8px);
          transition: var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .graph-controls button:hover {
          background: var(--accent-purple-glow);
          border-color: var(--accent-purple);
          color: var(--accent-purple);
          box-shadow: var(--shadow-glow);
        }
      `}</style>
    </div>
  );
}
