# 기능 구현 10차(impl/10) 테스트 시나리오

## 1. 개요
본 시나리오는 Papers-SR-Assistant 10차 구현분의 정상 작동 여부를 검증한다.
10차 구현 범위 (PRD Phase 2 / FR-4.3, pdf.js 설치 승인분):
- **앱 내 PDF 뷰어** (`src/components/PdfViewer.jsx`, `pdfjs-dist@6`): 상세 패널 "PDF 뷰어" 버튼 →
  전체 화면 모달 — 캔버스 렌더 + 선택 가능한 텍스트 레이어, 페이지 네비게이션, Esc/X 닫기,
  로드 실패 시 "새 탭에서 열기" 폴백.
- **선택 영역 AI 해설 (FR-4.3)**: 본문 드래그 → 액션바에 선택 표시 → "AI 해설" → LLM(9차 하이브리드)
  해설 드로어. LLM 미구성(시뮬레이터) 시 버튼 비활성.
- **arXiv 프록시**: arxiv.org 는 CORS 헤더 미제공 → `/arxiv` Vite 프록시(followRedirects) 경유,
  pdfUrl 자동 매핑.

## 2. 사전 조건
- `pnpm add pdfjs-dist` 완료 (사용자 승인), `pnpm build`/`pnpm lint` 통과.
- `pnpm dev` 기동, 시작 시 localStorage `psra:*` 초기화.
- Playwright(Chromium) 자동화 — PDF 는 오프셋 정합 픽스처(1페이지, "Attention formula ..." 텍스트)를
  `page.route` 로 서빙, LLM 은 Ollama 목킹. 실 arXiv 스모크(TC-10)는 네트워크 의존 — 실패 시 SKIP 허용.
- 원본 로그는 `logs/` 저장.

## 3. 케이스 표

| id | 목적 purpose | 입력 input | 기대결과 expected | 우선순위 |
|---|---|---|---|---|
| TC-01 | 빌드/린트 회귀 | `pnpm build`, `pnpm lint` | 빌드 성공, 신규 린트 오류 0건 | P0 |
| TC-02 | 뷰어 열기 + arXiv 매핑 | "PDF 뷰어" 클릭 (Transformer, arxiv pdfUrl) | `/arxiv/pdf/...` 로 요청, 캔버스 렌더, 페이지 "1 / 1" | P0 |
| TC-03 | 텍스트 레이어 | 렌더 완료 후 | `.pdf-text-layer` 에 "Attention" 텍스트 span 존재 | P0 |
| TC-04 | 선택 → AI 해설 | 텍스트 드래그 시뮬레이션 → "AI 해설" 클릭 (Ollama 목킹) | 액션바 선택 표시 → 해설 드로어 렌더, LLM 요청에 선택 텍스트 포함 | P0 |
| TC-05 | LLM 미구성 처리 | Ollama down 상태 reload | 힌트에 "시뮬레이터" 표기 + 해설 버튼 disabled | P0 |
| TC-06 | 로드 실패 폴백 | PDF 요청 차단 | 오류 메시지 + "새 탭에서 열기" 링크 | P0 |
| TC-07 | 닫기 | Esc 키 | 모달 소멸 | P1 |
| TC-08 | 페이지 네비 경계 | 1페이지 문서 | 이전/다음 버튼 모두 disabled | P1 |
| TC-09 | 회귀 | 모달 닫은 뒤 | 그래프·큐시트·상세 패널 정상 | P1 |
| TC-10 | 실 arXiv 스모크 | 목킹 해제, 실 Transformer PDF 로드 | 다중 페이지 로드 성공 (네트워크 장애 시 SKIP) | P2 |

## 4. 판정 기준
- P0 전건 PASS 필수. P1 실패 시 수정·재시험. P2(TC-10)는 외부 네트워크 의존 — 실패 시 사유 기록 후 SKIP 가능.
