# 시험 결과 / Test Result — impl 6차

- **일자 Date**: 2026-07-11
- **대상 Target**: Papers-SR-Assistant (React 19 + Vite 8, node-react SPA)
- **시험 도구**: Playwright(Chromium) 자동화 + `page.route` API 목킹 + `pnpm build`/`pnpm lint`
- **커밋 Commit**: (git 미사용 프로젝트)

## 요약 / Summary

- **전체 Total: 10, 통과 Pass: 10, 실패 Fail: 0**
- **최종 Verdict: PASS** (round 1 전건 통과 — 수정 라운드 불필요, 콘솔 에러 0건)

## 케이스 / Cases

| id | 결과 result | 비고 note |
|---|---|---|
| TC-01 | PASS | `pnpm build` 성공(140ms), 신규 린트 오류 0건 |
| TC-02 | PASS | 기본 상태 추천 2건 (DeiT 42%·RoBERTa 41% — 둘 다 시드 Transformer 직접 인용) |
| TC-03 | PASS | 관련도 내림차순, 전건 40% 이상 (직접 인용 가중치 0.4 반영) |
| TC-04 | PASS | 추천 "＋" 클릭 → 큐시트 5항목, 추천 1건으로 감소 |
| TC-05 | PASS | 전체 계보 프리셋(후보 소진) → 추천 0건 + 빈 안내 문구 |
| TC-06 | PASS | NLP 프리셋(시드 BERT) → ViT·DeiT·Swin 3건 (서지 결합·유사도 기반) |
| TC-07 | PASS | 외부 논문(Linformer, Transformer 직접 인용) 추가 → 추천 목록 편입 (4건) |
| TC-08 | PASS | 범례 "일반 논문 (색=연도)" + 그라데이션 스와치, 스크린샷 증적 |
| TC-09 | PASS | MD 내보내기: STEP 수 = 큐시트 수(3), 읽기 근거 라인 전건 포함 |
| TC-10 | PASS | 새로고침 후 큐시트 유지 + 추천 목록 동일 재계산 (결정성 확인) |

## 발견 오류 및 수정 / Bugs & Fixes

| round | 오류 bug | 원인 cause | 수정 fix | 재시험 retest |
|---|---|---|---|---|
| — | 없음 | — | — | round 1 전건 PASS |

## 첨부 / Logs

- `logs/e2e-run-round1.log` — round 1 실행 로그 (전건 PASS)
- `logs/e2e-results.json` — 케이스별 기계 판독 결과
- `logs/impl6-e2e.mjs` — 시험 자동화 스크립트
- `logs/tc02-recommendations.png`, `tc07-external-reco.png`, `tc08-year-colors.png` — 증적 스크린샷
- `logs/export-impl6.md` — MD 내보내기 산출물
