# 시험 결과 / Test Result — impl 10차

- **일자 Date**: 2026-07-11
- **대상 Target**: Papers-SR-Assistant (React 19 + Vite 8 + pdfjs-dist 6.1.200)
- **시험 도구**: Playwright(Chromium) 자동화 + 오프셋 정합 PDF 픽스처 서빙 + Ollama 목킹 + 실 arXiv 라이브 스모크 + `pnpm build`/`pnpm lint`
- **커밋 Commit**: (git 미사용 프로젝트)

## 요약 / Summary

- **전체 Total: 10, 통과 Pass: 10, 실패 Fail: 0**
- **최종 Verdict: PASS** (round 1 무결함 — 라이브 arXiv 스모크까지 실통과)

## 케이스 / Cases

| id | 결과 result | 비고 note |
|---|---|---|
| TC-01 | PASS | `pnpm add pdfjs-dist@6.1.200`(승인분) 후 빌드 성공(180ms), 신규 린트 오류 0건 |
| TC-02 | PASS | "PDF 뷰어" → arxiv pdfUrl 이 `/arxiv` 프록시로 매핑돼 요청, 캔버스 렌더, "1 / 1" |
| TC-03 | PASS | 텍스트 레이어에 "Attention formula E equals mc squared" 선택 가능 span 생성 |
| TC-04 | PASS | 드래그 선택 → 액션바 표시 → "AI 해설" → 해설 드로어 렌더, LLM 요청에 선택 텍스트 포함 확인 |
| TC-05 | PASS | LLM 미구성(시뮬레이터) → 힌트에 엔진 표기 + 해설 버튼 disabled |
| TC-06 | PASS | PDF 요청 차단 → 오류 메시지 + "새 탭에서 열기 ↗" 폴백 링크 |
| TC-07 | PASS | Esc → 모달 소멸 |
| TC-08 | PASS | 1페이지 문서에서 이전/다음 버튼 모두 disabled |
| TC-09 | PASS | 모달 닫은 후 그래프·큐시트·상세 패널 정상 (회귀 없음) |
| TC-10 | PASS | **실 arXiv Transformer PDF 라이브 로드: 15페이지** (`/arxiv` 프록시 + followRedirects 실검증) |

## 발견 오류 및 수정 / Bugs & Fixes

| round | 오류 bug | 원인 cause | 수정 fix | 재시험 retest |
|---|---|---|---|---|
| — | 없음 | — | — | round 1 전건 PASS |

- 콘솔 에러 2건은 의도된 요청 차단 목킹 (TC-05 tags abort, TC-06 PDF abort).

## 첨부 / Logs

- `logs/e2e-run-round1.log` — round 1 실행 로그 (전건 PASS)
- `logs/e2e-results.json` — 케이스별 기계 판독 결과
- `logs/impl10-e2e.mjs` — 시험 자동화 스크립트 (PDF 픽스처 생성기 포함)
- `logs/tc02-viewer.png`, `tc04-explain.png`, `tc10-live-arxiv.png` — 증적 스크린샷
