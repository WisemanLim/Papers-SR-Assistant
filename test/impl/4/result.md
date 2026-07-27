# 시험 결과 / Test Result — impl 4차

- **일자 Date**: 2026-07-11
- **대상 Target**: Papers-SR-Assistant (React 19 + Vite 8, node-react SPA)
- **시험 도구**: Playwright(Chromium) 자동화 + `page.route` API 목킹 (S2·OpenAlex) + `pnpm build`/`pnpm lint`
- **커밋 Commit**: (git 미사용 프로젝트)

## 요약 / Summary

- **전체 Total: 12, 통과 Pass: 12, 실패 Fail: 0**
- **최종 Verdict: PASS** (실 OpenAlex API 스모크 포함 전건 통과)

## 케이스 / Cases

| id | 결과 result | 비고 note |
|---|---|---|
| TC-01 | PASS | `pnpm build` 성공(207ms), 신규 린트 오류 0건 |
| TC-02 | PASS | Transformer → 기반 연구: "큐시트 내 3편이 직접 참조하는 기반 연구" |
| TC-03 | PASS | ViT → 교량: 선행 제목 인용 + "이후 1편이 본 연구를 참조" (round 1 FAIL 은 시험 스크립트 단언 결함 — 아래 표 참조) |
| TC-04 | PASS | BERT → 확장·응용 + "도메인 전이" 문구 (Core→NLP 분야 전환 감지) |
| TC-05 | PASS | Swin → 확장·응용, 동일 분야(Vision)라 "도메인 전이" 미표시 |
| TC-06 | PASS | 무관 외부 논문 → "독립 연구" + 피인용 42회 안내 |
| TC-07 | PASS | MD 내보내기: STEP 5개 전부에 `**읽기 근거**:` 라인 포함 |
| TC-08 | PASS | S2 500 → OpenAlex 폴백: 헤더 "OpenAlex 검색 결과 (1) · 폴백" |
| TC-09 | PASS | 폴백 결과 추가: 노드 7→8, 역인덱스 초록 복원 표시, 배치 참조 title 매칭으로 선행 연구 필터 2노드 |
| TC-10 | PASS | 양측 500 → "두 학술 API 모두 실패 — …" 표시, 크래시 없음 |
| TC-11 | PASS | S2 정상 시 "Semantic Scholar" 우선, 폴백 태그 없음 |
| TC-12 | PASS | **실 OpenAlex API** 스모크: S2 강제 다운 상태에서 실검색 8건 수신 (폴백 경로 실환경 검증) |

## 발견 오류 및 수정 / Bugs & Fixes

| round | 오류 bug | 원인 cause | 수정 fix | 재시험 retest |
|---|---|---|---|---|
| 1 | TC-03 FAIL | **소스 결함 아님** — 시험 스크립트 단언이 전체 제목("Attention Is All You Need")을 기대했으나, 근거 엔진의 `shortTitle` 이 22자 초과 제목을 "Attention Is All You…" 로 절단 표시 (설계 의도) | 시험 단언을 절단 표시와 호환되게 수정 (`impl4-e2e.mjs`) | round 2: 전건 PASS |

- 콘솔 에러 4건은 전부 의도된 500 목킹 응답 (`logs/console-errors-intentional.log`).

## 첨부 / Logs

- `logs/e2e-run-round2.log` — round 2 실행 로그 (12/12 PASS)
- `logs/e2e-results.json` — 케이스별 기계 판독 결과
- `logs/impl4-e2e.mjs` — 시험 자동화 스크립트 (S2·OpenAlex 목킹 포함)
- `logs/tc02-05-rationales.png`, `tc08-fallback.png` — 증적 스크린샷
- `logs/export-impl4.md` — 읽기 근거 라인 포함 MD 내보내기 산출물
- `logs/console-errors-intentional.log` — 의도된 500 목킹 에러 원본
