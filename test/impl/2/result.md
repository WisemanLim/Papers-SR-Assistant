# 시험 결과 / Test Result — impl 2차

- **일자 Date**: 2026-07-11
- **대상 Target**: Papers-SR-Assistant (React 19 + Vite 8, node-react SPA)
- **시험 도구**: Playwright(Chromium) 자동화 + `pnpm build`/`pnpm lint`
- **커밋 Commit**: (git 미사용 프로젝트)

## 요약 / Summary

- **전체 Total: 12, 통과 Pass: 12, 실패 Fail: 0**
- **최종 Verdict: PASS** (재시험 round 2에서 전건 통과)

## 케이스 / Cases

| id | 결과 result | 비고 note |
|---|---|---|
| TC-01 | PASS | `pnpm build` 성공(154ms), 신규 린트 오류 0건 (기존 경고 4건은 1차 구현분) |
| TC-02 | PASS | 3열 레이아웃 + 관계 필터 탭 4개 + 그래프 캔버스 렌더. round 1 콘솔 에러 2건 → round 2에서 0건 |
| TC-03 | PASS | BERT 선택 → 후속 연구: 2/6 노드 (BERT + RoBERTa) |
| TC-04 | PASS | BERT 선택 → 선행 연구: 2/6 노드 (BERT + Transformer, 이행적 참조 포함) |
| TC-05 | PASS | ViT 선택 → 유사 연구: 5/6 노드 (Transformer 제외 — 동일 분야/참조 공유 기준) |
| TC-06 | PASS | 관계: 전체 클릭 → 6/6 노드 복원 |
| TC-07 | PASS | 수동 편집 전환 시 표시 순서 유지 채택, 드래그 힌트 배너 + 그립 핸들 4개 |
| TC-08 | PASS | 1번 카드 → 3번 위치 DnD: [Attention, BERT, ViT, Swin] → [BERT, ViT, Attention, Swin] |
| TC-09 | PASS | 메모 입력(Enter 저장) → 메모 칩 렌더, 재클릭 수정 가능 |
| TC-10 | PASS | `Papers-CueSheet-2026-07-10.csv`: UTF-8 BOM, 헤더 13열, 데이터 4행(큐시트 수 일치), 따옴표 이스케이프 |
| TC-11 | PASS | `Papers-CueSheet-2026-07-10.bib`: 6개 엔트리, RoBERTa(arXiv)=@article, 나머지 5건=@inproceedings |
| TC-12 | PASS | `.md` 내보내기에 `📝 내 메모` 라인 포함 (프리셋 변경 후에도 메모 상태 유지) |

## 발견 오류 및 수정 / Bugs & Fixes

| round | 오류 bug | 원인 cause | 수정 fix | 재시험 retest |
|---|---|---|---|---|
| 1 | KaTeX CSS/JS CDN 리소스가 브라우저에서 차단됨 (콘솔 에러 2건) → 수식 LaTeX 렌더링 불가 | `index.html`의 SRI `integrity` 해시가 실제 파일 해시와 불일치 (1차 구현 시 잘못된 값 삽입) | 실제 katex@0.16.8 파일을 다운로드해 SHA-384 해시를 로컬 계산 후 `integrity` 값 교체 (`index.html:13-14`) | round 2: 콘솔 에러 0건, 전건 PASS |

## 첨부 / Logs

- `logs/e2e-run-round2.log` — round 2 실행 로그 (12/12 PASS)
- `logs/e2e-results.json` — 케이스별 기계 판독 결과
- `logs/console-errors-round1.log` — round 1 KaTeX SRI 차단 에러 원본
- `logs/impl2-e2e.mjs` — 시험 자동화 스크립트 (Playwright)
- `logs/tc02-initial.png`, `tc03-derivative.png`, `tc05-similar.png`, `tc08-dnd.png` — 증적 스크린샷
- `logs/export.csv`, `export.bib`, `export.md` — 내보내기 산출물 원본
