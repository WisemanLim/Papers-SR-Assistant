# 시험 결과 / Test Result — impl 9차

- **일자 Date**: 2026-07-11
- **대상 Target**: Papers-SR-Assistant (React 19 + Vite 8, node-react SPA)
- **시험 도구**: Playwright(Chromium) 자동화 + 프로바이더별 `page.route` 목킹 + 실 로컬 Ollama(mistral) 스모크 + `pnpm build`/`pnpm lint`
- **커밋 Commit**: (git 미사용 프로젝트)

## 요약 / Summary

- **전체 Total: 9, 통과 Pass: 9, 실패 Fail: 0** (P2 라이브 스모크까지 실통과)
- **최종 Verdict: PASS**

## 케이스 / Cases

| id | 결과 result | 비고 note |
|---|---|---|
| TC-01 | PASS | `pnpm build` 성공(163ms), 신규 린트 오류 0건 |
| TC-02 | PASS | 키 없음 + Ollama 가용 → 배지 "Ollama (test-model)" (자동 모델 선택) |
| TC-03 | PASS | 챗 실연동: 목킹 응답 렌더 + 요청 system 프롬프트에 논문 제목 포함 (컨텍스트 그라운딩 확인) |
| TC-04 | PASS | chat 500 → "⚠️ LLM 호출 실패(...) — 규칙 기반 응답으로 대체" + 시뮬레이터 답 병기 |
| TC-05 | PASS | Ollama 미기동 → 배지 "규칙 기반 시뮬레이터" + 기존 규칙 응답(WMT 2014) 정상 |
| TC-06 | PASS | localStorage `psra:geminiKey` 설정 → 배지 "Gemini (gemini-2.0-flash)" + Gemini 목킹 응답 |
| TC-07 | PASS | 외부 논문만 "AI 한글 요약 생성" 버튼 노출(목 논문 0개), 클릭 → tldr 갱신 + 새로고침 후 영속 |
| TC-08 | PASS | **실 로컬 Ollama(mistral:latest) 라이브 질의 → 실제 응답 수신** (폴백 마커 없음) |
| TC-09 | PASS | 추천 섹션·큐시트 회귀 무영향 |

## 발견 오류 및 수정 / Bugs & Fixes

| round | 오류 bug | 원인 cause | 수정 fix | 재시험 retest |
|---|---|---|---|---|
| 1 | TC-07 스크립트 중단 | **소스 결함 아님** — 시험이 외부 논문을 추천 목록에서 재선택하려 했으나 해당 논문은 시드와 유사도가 임계(0.05) 미달이라 추천에 없음 | 재선택 경로를 큐시트 카드 클릭으로 변경 (추가 시 큐시트 담기 포함) | round 2: 8/8 PASS |

- 콘솔 에러 2건은 의도된 500 목킹(TC-04) + tags 요청 차단(TC-05).

## 첨부 / Logs

- `logs/e2e-run-round2.log` — round 2 실행 로그 (전건 PASS)
- `logs/e2e-results.json` — 케이스별 기계 판독 결과
- `logs/impl9-e2e.mjs` — 시험 자동화 스크립트 (3개 프로바이더 목킹 + 라이브 스모크)
- `logs/tc02-ollama-badge.png`, `tc03-chat.png`, `tc07-tldr.png`, `tc08-live-ollama.png` — 증적 스크린샷
