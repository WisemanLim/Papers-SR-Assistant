# Papers-SR-Assistant (AI 논문 읽기 큐시트)

[English Version](./README.en.md) | [PRD 명세서](./.docs/PRD.md)

---

## 1. 개요 (Overview)
**Papers-SR-Assistant**는 연구자가 복잡한 논문 인용 계보와 발전 흐름을 시각적으로 파악하고, 최적화된 논문 독서 순서(큐시트 로드맵)를 설계할 수 있도록 돕는 AI 기반 학술 동향 및 큐시트 관리 웹 애플리케이션입니다.

- **도메인**: 학술 연구 지원 (Academic Research Support / Science)
- **주요 기능**:
  - **학술 실검색 (FR-1.1/1.2, 하이브리드)**: 검색 바에서 Enter 입력 시 Semantic Scholar Graph API 로 실제 논문 검색 (키워드·제목·DOI·arXiv ID), 실패 시 **OpenAlex 자동 폴백** (드롭다운에 데이터 출처 표시). 결과를 컬렉션에 추가하면 참조 목록을 조회해 기존 논문과 인용 엣지를 자동 연결.
  - **읽기 근거 자동 생성 (FR-3.2)**: 인용 그래프 구조 분석으로 큐시트 각 단계의 추천 근거를 생성 — 기반(foundation)/교량(bridge)/확장·응용(frontier, 도메인 전이 감지)/독립(standalone) 4유형. 외부 추가 논문에도 동작하며 MD 내보내기에 포함.
  - **시간축 기반 인용 네트워크 시각화**: 논문 발행 연도에 맞춘 chronological 타임라인 계보도 (추가 논문 연도에 맞춰 축 범위 자동 확장).
  - **관계 필터링 (FR-2.2)**: 선택 논문 기준 선행 연구(이행적 참조) / 후속 연구(이행적 피인용) / 유사 연구(서지 결합 + 동일 분야) 그래프 필터.
  - **논문 큐시트 생성 및 관리 (FR-3.3)**: 위상 정렬(Topological Sort) 자동 배치, 수동 편집 모드에서 **드래그 앤 드롭 재정렬**, 논문별 **메모** 추가/수정.
  - **AI 요약 및 인터랙티브 대화형 챗봇 (LLM 하이브리드)**: Gemini API 키 설정 시 Gemini(gemini-2.0-flash), 미설정 시 **로컬 Ollama 자동 폴백**, 둘 다 불가 시 규칙 기반 시뮬레이터 — 논문 컨텍스트(제목·요약·기여·한계·수식)를 시스템 프롬프트로 주입해 근거 기반 응답(환각 방지). 외부 논문은 "AI 한글 요약 생성" 버튼으로 TL;DR 생성(영속). 챗 탭에 응답 엔진 배지 표시.
  - **다중 포맷 내보내기 (FR-5.1)**: 큐시트를 **Markdown(.md) / CSV(.csv) / BibTeX(.bib)** 파일로 즉시 다운로드 (메모 포함).
  - **워크스페이스 영속성 + 캐싱 (Phase 1 "저장" / NFR §5-1)**: 추가 논문·인용 엣지·큐시트·시드·메모·정렬 모드를 localStorage 에 자동 저장/복원. API 응답은 24h TTL 캐시로 rate-limit 부담 감소. 헤더 "초기화" 버튼으로 전체 리셋.
  - **양방향 인용 연결 (FR-2.1)**: 논문 추가 시 참조(선행)와 피인용(후속) 양방향을 조회해 컬렉션 내 논문과 엣지 자동 생성. 일반 노드 색상은 발행 연도 → 색상(hue) 매핑.
  - **추천 엔진 랭킹 (FR-1.3)**: 시드 논문 기준 직접 인용 + Bibliographic Coupling + Co-citation + 텍스트 유사도(Jaccard) 조합 점수로 연관 논문을 관련도 % 내림차순 추천 — 큐시트 하단 섹션에서 원클릭 추가.
  - **반응형 레이아웃 (NFR §5-2)**: 태블릿 가로(≤1180px)는 열 비율 조정, 태블릿 세로(≤920px)는 중앙 그래프 전폭 + 좌(큐시트)·우(상세) 패널 슬라이드 오버레이 (헤더 토글 버튼 + 백드롭 닫기).
  - **큐시트 공유 링크 (Phase 3, 서버리스)**: 워크스페이스 전체를 URL 해시(`#share=`)에 인코딩 — "공유" 버튼으로 링크 생성·클립보드 복사, 수신자는 confirm 후 무손실 복원 (신규 탭·기존 탭 모두 지원, 백엔드 불필요).
  - **앱 내 PDF 뷰어 + 선택 영역 AI 해설 (FR-4.3)**: pdf.js 기반 전체 화면 리더 — 페이지 네비게이션, 선택 가능한 텍스트 레이어, 본문 드래그 → "AI 해설"(LLM 하이브리드) 드로어. arXiv PDF 는 `/arxiv` 프록시 경유(CORS 우회), 로드 실패 시 새 탭 폴백.
  - **실시간 다인 협업 (Phase 3, WebSocket 백엔드)**: 헤더 "협업" 버튼으로 공유 세션 시작(참여 링크 자동 복사) — 참여자들의 큐시트·메모·시드·외부 논문이 실시간 양방향 동기화(last-write-wins). 참여자 수 배지, 이탈 감지, 서버 미기동 시 오류 배지.

---

## 2. 아키텍처 및 디렉터리 구조 (Architecture & Directory Structure)
Vite + React (JS) + CSS-in-JS/Tailwind CSS 구조로 완전한 클라이언트 단독 프론트엔드로 구현되어 있습니다. CORS 정책 제약이 없는 프리셋 Mock 데이터베이스 방식을 채택하여 최적의 성능과 이식성을 보장합니다.

```text
Papers-SR-Assistant/
├── dist/                     # 빌드 정적 산출물
├── public/                   # 정적 자산 (로고 등)
├── server/
│   └── collab-server.mjs     # 실시간 협업 WebSocket 서버 (ws, :8787, 세션별 상태 브로드캐스트)
├── src/
│   ├── api/
│   │   ├── semanticScholar.js # Semantic Scholar Graph API 클라이언트 (검색·참조 연동, /s2api 프록시 경유)
│   │   ├── openAlex.js       # OpenAlex 폴백 클라이언트 (역인덱스 초록 복원·참조 배치 조회, CORS 직접 호출)
│   │   ├── llm.js            # LLM 하이브리드 (Gemini → Ollama /ollama 프록시 → 시뮬레이터, 논문 컨텍스트 프롬프트)
│   │   └── collab.js         # 협업 클라이언트 (/collab ws 프록시, join/update/peers 프로토콜)
│   ├── lib/
│   │   ├── rationale.js      # 읽기 근거 엔진 (인용 구조 기반 기반/교량/확장/독립 분류)
│   │   ├── recommend.js      # 추천 랭킹 엔진 (직접 인용·서지 결합·공동 인용·토큰 유사도 조합)
│   │   ├── storage.js        # 워크스페이스 영속성 (외부 논문·엣지 패치·큐시트·메모, 방어적 파싱)
│   │   ├── share.js          # 공유 링크 인코딩/디코딩 (URL 해시, 유니코드 안전 base64)
│   │   └── cache.js          # API 응답 localStorage 캐시 (TTL 24h, 오류 미캐시)
│   ├── components/
│   │   ├── CueSheet.jsx      # 좌측 열: 큐시트 로드맵 및 정렬 모듈
│   │   ├── GraphView.jsx     # 중앙 열: vis-network 기반 인용 관계 타임라인
│   │   ├── DetailPanel.jsx   # 우측 열: 논문 상세정보, LaTeX 렌더링, AI 챗봇
│   │   └── PdfViewer.jsx     # 전체 화면 PDF 리더 (pdfjs-dist, 텍스트 선택 → AI 해설)
│   ├── data/
│   │   └── mockPapers.js     # 프리셋 학술 데이터베이스 (논문 6종 및 실제 인용 관계 포함)
│   ├── App.jsx               # 대시보드 레이아웃 및 상태 관리 총괄
│   ├── index.css             # 글래스모피즘(Glassmorphism) 프리미엄 다크 모드 스타일
│   └── main.jsx              # 애플리케이션 엔트리 포인트
├── test/
│   ├── dev-env/              # 개발 환경 검증 시나리오 및 결과
│   └── impl/
│       ├── 1/                # 1차 구현 검증 시나리오 및 PASS 결과
│       ├── 2/                # 2차 구현(관계 필터·DnD·메모·CSV/BibTeX) 검증 및 PASS 결과
│       ├── 3/                # 3차 구현(Semantic Scholar 실검색·참조 연동) 검증 및 PASS 결과
│       ├── 4/                # 4차 구현(읽기 근거 엔진·OpenAlex 폴백) 검증 및 PASS 결과
│       ├── 5/                # 5차 구현(영속성·양방향 엣지·캐싱) 검증 및 PASS 결과
│       ├── 6/                # 6차 구현(추천 엔진·연도 색상) 검증 및 PASS 결과
│       ├── 7/                # 7차 구현(반응형 태블릿 레이아웃) 검증 및 PASS 결과
│       ├── 8/                # 8차 구현(큐시트 공유 링크) 검증 및 PASS 결과
│       ├── 9/                # 9차 구현(LLM 하이브리드: Gemini·Ollama·시뮬레이터) 검증 및 PASS 결과
│       ├── 10/               # 10차 구현(PDF 뷰어 + 선택 AI 해설) 검증 및 PASS 결과
│       └── 11/               # 11차 구현(실시간 협업 백엔드) 검증 및 PASS 결과
├── index.html                # 구글 폰트 및 KaTeX CDN 의존성 주입
├── package.json              # 의존성 정의
├── pnpm-lock.yaml            # pnpm 락파일
└── vite.config.js            # Vite 번들러 설정
```

---

## 3. 사전 요구사항 (Prerequisites)
프로젝트를 실행하고 빌드하기 위해 아래의 소프트웨어가 로컬 컴퓨터에 설치되어 있어야 합니다.

- **Node.js**: `v22.23.1` 이상 권장
- **Package Manager**: `pnpm v11.10.0` 이상 권장 (또는 `npm v10.x` 이상)

---

## 4. 환경 설정 (Configuration)
애플리케이션은 기본 컬렉션으로 로컬 Mock 데이터(6편)를 사용하며, 학술 실검색은 **Semantic Scholar Graph API**(1순위) + **OpenAlex API**(자동 폴백)를 조합한 하이브리드 구성입니다 (둘 다 API 키 불필요).

- **API 프록시**: Semantic Scholar 는 오류 응답에 CORS 헤더가 없어 Vite 프록시 `/s2api` → `https://api.semanticscholar.org` 를 경유합니다 ([vite.config.js](./vite.config.js) `server.proxy`/`preview.proxy`). dev·preview 서버에서 동작하며, 별도 정적 호스팅 배포 시에는 동일한 리버스 프록시 설정이 필요합니다. OpenAlex 는 CORS 를 완전 허용하므로 직접 호출합니다.
- **Rate limit**: Semantic Scholar 공용 풀 기준 간헐적 HTTP 429 가 발생할 수 있으며, 이 경우 OpenAlex 로 자동 폴백됩니다 (드롭다운 헤더에 "OpenAlex … 폴백" 표시). 양측 모두 실패 시 오류 메시지로 안내합니다. 대량 사용 시 [API 키 발급](https://www.semanticscholar.org/product/api) 후 확장 가능합니다. (실시크릿을 저장소에 커밋하지 마세요.)
- **로컬 데이터**: 워크스페이스(추가 논문·메모 등)는 `localStorage` 키 `psra:workspace:v1`, API 캐시는 `psra:cache:*` 에 저장됩니다 (24h TTL). 헤더 "초기화" 버튼 또는 브라우저 저장소 삭제로 리셋할 수 있습니다.
- **LLM 설정 (.env.example 참조)**: `cp .env.example .env.local` 후 `VITE_GEMINI_API_KEY` 설정 시 Gemini 사용 (런타임 주입은 localStorage `psra:geminiKey`, 로컬 전용). 미설정 시 로컬 **Ollama**(`http://localhost:11434`, `/ollama` 프록시 경유)로 자동 폴백 — `VITE_OLLAMA_MODEL` 미지정 시 설치된 첫 모델 자동 선택. Ollama 도 없으면 규칙 기반 시뮬레이터로 동작합니다. **실제 API 키를 저장소에 커밋하지 마세요** (`.env*` 는 gitignore 처리됨).

---

## 5. 실행 방법 (Usage)

### 1) 의존성 패키지 설치
```bash
pnpm install
```

### 2) 로컬 개발 서버 실행 (HMR 지원)
```bash
npm run dev
```

### 3) 프로덕션 빌드 (배포용 정적 파일 생성)
```bash
npm run build
```

### 4) 빌드 결과물 로컬 미리보기
```bash
npm run preview
```

### 5) 실시간 협업 서버 (선택 — 협업 기능 사용 시)
```bash
pnpm collab   # = node server/collab-server.mjs, 포트 8787
```
dev 서버와 함께 실행하면 헤더 "협업" 버튼이 활성 동작합니다. 미기동 시 협업 버튼은 "연결 실패"를 표시하며 나머지 기능은 정상입니다.

---

## 6. 접속 및 포트 (Ports & Access)

| 서비스 명 | 프로토콜 | 기본 포트 | 접속 경로 | 비고 |
| :--- | :--- | :--- | :--- | :--- |
| **Vite Dev Server** | HTTP | `5173` | `http://localhost:5173/` | 로컬 개발 서버 (프록시: `/s2api`·`/ollama`·`/arxiv`·`/collab`) |
| **Vite Preview** | HTTP | `4173` | `http://localhost:4173/` | 프로덕션 빌드 미리보기 |
| **협업 서버** | WS/HTTP | `8787` | `ws://localhost:8787` · `GET /health` | `pnpm collab`, 실시간 세션 동기화 |

---

## 7. 주요 컴포넌트 데이터 및 흐름 예시 (Data Flow)

### 1) 논문 객체 데이터 포맷 (예시)
```javascript
{
  id: "transformer_2017",
  title: "Attention Is All You Need",
  authors: "Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones, Aidan N. Gomez, Łukasz Kaiser, Illia Polosukhin",
  venue: "NeurIPS",
  year: 2017,
  citations: 112000,
  category: "Core",
  tldr: "RNN이나 CNN 없이 자가 어텐션(Self-Attention) 메커니즘만을 사용하는 최초의 Sequence-to-Sequence 아키텍처인 Transformer를 제안했습니다.",
  contributions: "재귀적 루프(Recurrent loops)를 완전히 제거하고 병렬 처리가 가능한 Self-Attention 메커니즘을 도입하여 학습 속도와 장기 의존성(Long-range dependency) 학습 능력을 획기적으로 개선했습니다.",
  datasets: "WMT 2014 English-to-German & English-to-French",
  metrics: "BLEU Score: 28.4 (En-De), 41.8 (En-Fr)",
  limitations: "입력 시퀀스 길이가 $N$에 대해 메모리 및 연산 복잡도가 quadratic ($O(N^2)$)으로 증가하여 매우 긴 시퀀스 처리에 한계가 있습니다.",
  equations: [
    {
      name: "Scaled Dot-Product Attention",
      latex: "Attention(Q, K, V) = \\text{softmax}(\\frac{QK^T}{\\sqrt{d_k}})V",
      description: "쿼리(Q)와 키(K)의 내적을 키의 차원 수의 제곱근(\\sqrt{d_k})으로 나누어 스케일링한 후 소프트맥스를 취해 값(V)의 가중합을 구합니다."
    }
  ],
  references: []
}
```

---

## 8. 테스트 (Testing)
본 프로젝트는 구현 차수마다 `test/impl/<N>/` 에 시나리오·결과·로그를 남기는 시험 사이클을 따릅니다.

- **개발 환경 검증**: `test/dev-env/`
  - 의존성 무결성 및 Vite 빌드 성공 검증 완료 (**PASS**)
- **1차 기능 검증**: `test/impl/1/`
  - 필터 탭 클릭, BERT 노드 더블클릭(시드 설정), AI 질의 전송, 마크다운 내보내기 동작성 검증 완료 (**PASS**)
- **2차 기능 검증**: `test/impl/2/`
  - 관계 필터링(선행/후속/유사), 수동 모드 드래그 앤 드롭 재정렬, 논문별 메모, CSV/BibTeX/MD 내보내기 — Playwright(Chromium) 자동화 12케이스 (**PASS**, 12/12)
  - 재실행: `pnpm dev` 기동 후 `node test/impl/2/logs/impl2-e2e.mjs test/impl/2/logs`
- **3차 기능 검증**: `test/impl/3/`
  - Semantic Scholar 실검색(Enter 트리거), 컬렉션 추가 + 참조 자동 연결, 타임라인 동적 확장, 오류/빈결과 처리 — API 목킹 기반 Playwright 11케이스 (**PASS**, 10 PASS / 1 SKIP: 실 API 스모크는 공용 rate-limit 로 SKIP)
  - 재실행: `pnpm dev` 기동 후 `node test/impl/3/logs/impl3-e2e.mjs test/impl/3/logs`
- **4차 기능 검증**: `test/impl/4/`
  - 읽기 근거 4유형(기반/교량/확장·응용/독립 + 도메인 전이), MD 근거 라인, OpenAlex 폴백·추가·참조 연결, 양측 실패 처리, 실 OpenAlex 스모크 — Playwright 12케이스 (**PASS**, 12/12)
  - 재실행: `pnpm dev` 기동 후 `node test/impl/4/logs/impl4-e2e.mjs test/impl/4/logs`
- **5차 기능 검증**: `test/impl/5/`
  - 워크스페이스 영속성(새로고침 복원·손상 데이터 방어·초기화 confirm), 피인용 양방향 엣지, API 캐시 적중/키 분리 — Playwright 10케이스 (**PASS**, 10/10)
  - 재실행: `pnpm dev` 기동 후 `node test/impl/5/logs/impl5-e2e.mjs test/impl/5/logs`
- **6차 기능 검증**: `test/impl/6/`
  - 추천 랭킹(기본/프리셋별/외부 논문 편입/후보 소진), 원클릭 추가, 연도 색상 범례, 영속성·내보내기 회귀 — Playwright 10케이스 (**PASS**, 10/10, round 1 무결함)
  - 재실행: `pnpm dev` 기동 후 `node test/impl/6/logs/impl6-e2e.mjs test/impl/6/logs`
- **7차 기능 검증**: `test/impl/7/`
  - 반응형 레이아웃: 1600/1024/800px 뷰포트 전환, 오버레이 패널 열기/닫기·내부 상호작용, 가로 오버플로·백드롭 잔존 검사 — Playwright 9케이스 (**PASS**, 9/9, round 1 무결함)
  - 재실행: `pnpm dev` 기동 후 `node test/impl/7/logs/impl7-e2e.mjs test/impl/7/logs`
- **8차 기능 검증**: `test/impl/8/`
  - 공유 링크 생성(클립보드)·가져오기(수락/거부)·외부 논문 라운드트립·손상 해시 방어·재공유 결정성 — Playwright 8케이스 (**PASS**, 8/8)
  - 재실행: `pnpm dev` 기동 후 `node test/impl/8/logs/impl8-e2e.mjs test/impl/8/logs`
- **9차 기능 검증**: `test/impl/9/`
  - LLM 하이브리드: 프로바이더 감지(Gemini/Ollama/시뮬레이터), 챗 실연동 + 컨텍스트 그라운딩, 오류 폴백, 외부 논문 한글 요약 생성·영속, **실 로컬 Ollama(mistral) 라이브 스모크** — Playwright 9케이스 (**PASS**, 9/9)
  - 재실행: `pnpm dev` 기동 후 `node test/impl/9/logs/impl9-e2e.mjs test/impl/9/logs`
- **10차 기능 검증**: `test/impl/10/`
  - PDF 뷰어: arXiv 프록시 매핑·캔버스/텍스트 레이어 렌더·선택 → AI 해설(프롬프트 검증)·LLM 미구성 비활성·로드 실패 폴백·**실 arXiv 15페이지 라이브 로드** — Playwright 10케이스 (**PASS**, 10/10, round 1 무결함)
  - 재실행: `pnpm dev` 기동 후 `node test/impl/10/logs/impl10-e2e.mjs test/impl/10/logs`
- **11차 기능 검증**: `test/impl/11/`
  - 실시간 협업: 서버 헬스·세션 시작/참여(초기 상태 시드)·**2-페이지 양방향 동기화(메모/큐시트/외부 논문)**·이탈 감지·종료 토글·서버 다운 처리 — Playwright 11케이스 (**PASS**, 11/11, round 1 무결함)
  - 재실행: `pnpm collab` + `pnpm dev` 기동 후 `node test/impl/11/logs/impl11-e2e.mjs test/impl/11/logs`

---

## 9. 문제 해결 및 성능 최적화 (Troubleshooting)

### ① React 19 StrictMode의 double-mount로 인한 vis-network `fit` crash
- **증상**: React 19 StrictMode 개발 환경에서 컴포넌트가 마운트 $\rightarrow$ 언마운트 $\rightarrow$ 재마운트될 때, 첫 번째 마운트의 타이머가 만료되어 `network.fit()`을 실행할 시점에는 이미 인스턴스가 `destroy()`되어 `TypeError: Cannot read properties of undefined (reading 'fit')` 예외를 유발함.
- **해결**: `network.once("afterDrawing", ...)` 이벤트 핸들러를 도입하여 캔버스가 실제 1회 렌더링에 성공한 정확한 시점에 `fit()`이 호출되도록 하였으며, `Network.prototype.fit` 및 `moveTo`, `getScale` 메서드를 원숭이 패치(monkey-patch)하여 만약 인스턴스가 강제 소멸된 상태(`this.view`가 undefined)인 경우에는 예외를 던지지 않고 안전하게 즉시 반환하도록 함으로써 오류 발생을 근본적으로 차단했습니다.

### ② vis-network Canvas 사이즈 팽창 무한 루프 (Flexbox Height 1828px 버그)
- **증상**: `.graph-canvas-wrapper`가 플렉스 컨테이너 안에서 `flex: 1` 상태일 때, 내부 canvas의 dynamic resize 동작과 CSS flexbox의 기본값인 `min-height: auto`가 상호 유기적으로 결합되어 높이가 1800px 이상으로 비정상 팽창 및 화면 밖으로 이탈하여 노드가 보이지 않는 버그 발생.
- **해결**: `.graph-canvas-wrapper`의 CSS 스타일에 `min-height: 0`을 추가 지정하여 플렉스 아이템의 자동 크기 조절을 엄격하게 제한함으로써 캔버스가 부모 크기인 505px에 알맞게 제한되고 노드가 정상적으로 노출되도록 개선했습니다.

### ③-1 Semantic Scholar API 브라우저 직접 호출 시 CORS 차단 (3차 시험에서 발견)
- **증상**: 실검색 시 브라우저 콘솔에 `blocked by CORS policy: No 'Access-Control-Allow-Origin' header` 오류. API 의 오류 응답(429 등)에 CORS 헤더가 없어 rate-limit 상황이 CORS 오류로 표면화됨.
- **해결**: Vite `server.proxy`/`preview.proxy` 에 `/s2api` 프록시를 추가하고 API 클라이언트가 프록시를 경유하도록 변경. 브라우저 입장에서는 same-origin 호출이 되어 CORS 가 발생하지 않음.

### ③-2 검색 결과 추가 직후 그래프가 비어 보임 (3차 시험에서 발견)
- **증상**: 검색어가 입력창에 남아 로컬 필터가 계속 적용되어, 새로 추가된 논문을 포함한 전체 노드가 숨겨짐.
- **해결**: 논문 추가 완료 시 검색어를 자동으로 초기화하여 전체 컬렉션이 즉시 보이도록 수정.

### ③-3 열린 탭에 공유 URL 붙여넣기 시 가져오기 무반응 (8차 시험에서 발견)
- **증상**: 앱이 이미 열린 탭에서 공유 링크(`#share=...`)로 이동하면 아무 일도 일어나지 않음. 해시만 다른 URL 은 same-document 내비게이션이라 페이지가 리로드되지 않아, 마운트 시 1회만 실행되는 가져오기 로직이 동작하지 않았음.
- **해결**: 가져오기 로직을 `hashchange` 이벤트 리스너로도 구동하도록 확장 — 신규 탭(마운트)과 기존 탭(해시 변경) 양쪽을 커버합니다.

### ④ KaTeX CDN 리소스가 SRI integrity 불일치로 차단됨 (2차 시험에서 발견)
- **증상**: `index.html`의 KaTeX CSS/JS `<link>`/`<script>` 태그에 잘못된 SHA-384 `integrity` 해시가 지정되어 브라우저가 리소스를 차단, 콘솔 에러 2건과 함께 수식 LaTeX 렌더링이 동작하지 않음.
- **해결**: katex@0.16.8 실제 배포 파일을 다운로드해 `openssl dgst -sha384`로 해시를 로컬 계산한 뒤 `integrity` 속성 값을 교체했습니다. 재시험에서 콘솔 에러 0건 확인.

---

## 10. 다음 단계 (Next Steps / Roadmap)
1. **AI 기능 연동 (PRD Phase 2)**: 추천 엔진에 임베딩 유사도 추가(현재 토큰 Jaccard). ~~Gemini + Ollama 폴백 챗/요약~~ (9차 완료) ~~PDF 뷰어 + 선택 영역 AI 해설~~ (10차 완료)
2. **검색 고도화**: Semantic Scholar API 키 적용(rate-limit 완화), 추가 논문의 요약/기여점 자동 보강(현재 초록 기반 대체 필드). ~~OpenAlex 하이브리드~~ (4차 완료) ~~피인용 방향 자동 연결~~ (5차 완료)
3. **커스텀 데이터**: 사용자가 직접 PDF 논문을 드래그앤드롭하여 로컬 LLM을 통해 요약 및 기여점을 자동으로 추출하는 기능.
4. **계보 공유 (PRD Phase 3)**: Zotero·Notion 연동은 **옵션 기능으로 보류** (기본 비활성 — PRD 2026-07-11 범위 조정). ~~큐시트 공유 URL~~ (8차 완료) ~~실시간 다인 협업 백엔드~~ (11차 완료 — 운영 배포 시 인증·영속 스토리지 보강 필요)
