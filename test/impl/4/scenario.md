# 기능 구현 4차(impl/4) 테스트 시나리오

## 1. 개요
본 시나리오는 Papers-SR-Assistant 4차 구현분의 정상 작동 여부를 검증한다.
4차 구현 범위:
- **[FR-3.2] 추천 근거 엔진 일반화**: 하드코딩된 논문별 근거 문구를 인용 그래프 구조 분석 기반 생성기
  (`src/lib/rationale.js`)로 대체 — 기반(foundation)/교량(bridge)/확장·응용(frontier, 도메인 전이 감지)/독립(standalone)
  4유형. 외부 추가 논문에도 동작. MD 내보내기에 `읽기 근거` 라인 추가.
- **[PRD §5-3] 하이브리드 데이터**: Semantic Scholar 실패 시 **OpenAlex 폴백 검색**
  (`src/api/openAlex.js`) — 역인덱스 초록 복원, 참조 배치 조회로 컬렉션 인용 엣지 연결, 드롭다운에 데이터 출처 표시.

## 2. 사전 조건
- `pnpm build` / `pnpm lint` 통과 (회귀 없음).
- `pnpm dev` 로 `http://localhost:5173/` 기동.
- Playwright(Chromium) 자동화. S2(`/s2api/**`)·OpenAlex(`api.openalex.org/**`) 응답은 `page.route` 목킹 (TC-02~11),
  실 OpenAlex 스모크는 별도 케이스 (TC-12, 외부 가용성 의존 — 실패 시 SKIP 허용).
- 원본 로그는 `logs/` 저장.

## 3. 케이스 표

| id | 목적 purpose | 입력 input | 기대결과 expected | 우선순위 |
|---|---|---|---|---|
| TC-01 | 빌드/린트 회귀 | `pnpm build`, `pnpm lint` | 빌드 성공, 신규 린트 오류 0건 | P0 |
| TC-02 | 기반(foundation) 근거 | 기본 로드, Transformer 카드 | "기반 연구" + 의존 논문 수("3편") 포함 | P0 |
| TC-03 | 교량(bridge) 근거 | ViT 카드 (선행 Transformer + 후속 Swin) | "교량" + 선행 논문 제목 인용 포함 | P0 |
| TC-04 | 확장·응용 + 도메인 전이 | BERT 카드 (선행 Core → 자신 NLP) | "확장·응용" + "도메인 전이" 문구 포함 | P0 |
| TC-05 | 확장·응용 (동일 분야) | Swin 카드 (첫 선행 ViT 동일 Vision) | "확장·응용" 포함, "도메인 전이" 미포함 | P1 |
| TC-06 | 독립(standalone) 근거 | 컬렉션과 무관한 외부 논문 추가 후 큐시트 담기 | "독립 연구" + 피인용 수 포함 | P0 |
| TC-07 | MD 근거 라인 | "MD" 내보내기 | 각 STEP 에 `**읽기 근거**:` 라인 (스텝 수와 동일 개수) | P0 |
| TC-08 | OpenAlex 폴백 검색 | S2=500 목킹 + OpenAlex=200 목킹, Enter | 드롭다운 헤더 "OpenAlex … 폴백", 결과 표시 | P0 |
| TC-09 | 폴백 결과 추가 + 참조 연결 | OpenAlex 결과 "추가" (배치 참조에 Transformer 제목) | 노드 +1, 역인덱스 복원 초록 표시, 선행 연구 필터 2노드 | P0 |
| TC-10 | 양측 실패 처리 | S2=500 + OpenAlex=500 목킹 | "두 학술 API 모두 실패" 오류 표시, 크래시 없음 | P0 |
| TC-11 | S2 우선순위 | S2=200 목킹 | 드롭다운 헤더 "Semantic Scholar", "폴백" 미표시 | P1 |
| TC-12 | 실 OpenAlex 스모크 | 목킹 해제, 실 검색 | 결과 ≥ 1건 (외부 장애 시 SKIP 기록) | P2 |

## 4. 판정 기준
- P0 전건 PASS 필수. P1 실패 시 수정·재시험. P2(TC-12)는 외부 서비스 가용성 의존 — 실패 시 사유 기록 후 SKIP 가능.
