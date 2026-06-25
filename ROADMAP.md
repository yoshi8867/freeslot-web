# ROADMAP — freeslot-web

> 단일 소스. `[ ]` 미착수 / `[~]` 진행중 / `[x]` 완료.
> 규약: 사용자 테스트 게이트 통과 전 commit 금지, push는 사용자 승인 후.

## 1. 세팅
- [x] 폴더·구조(server/ + src/), Vite(React+TS)+Express, package.json/tsconfig/vite.config
- [x] `/healthz` 엔드포인트
- [x] README, render.yaml, .gitignore
- [ ] 독립 git repo init + 최초 커밋 (사용자 승인 후)
- [ ] GitHub repo 생성 + push (사용자 승인 후)

## 2. 백엔드 프록시
- [x] `GET /api/timetable?school=&r=` — comci.net 호출(UTF-8 디코딩, trailing garbage strip), JSON 반환
- [x] 매직넘버/쿼리 빌드(base64), 환경변수 덮어쓰기(`COMCI_ROUTE`/`COMCI_PREFIX`)
- [x] 잘못된 입력/업스트림 실패 처리(400/502)
- [ ] (선택) `/st` 로더 동적 파싱으로 매직넘버 런타임 추출

## 3. 로직 이식 + 테스트
- [x] `parser.ts` (자료446/492/학급수/일과시간/일자자료/오늘r/시작일/자료481/자료147)
- [x] `schedule.ts` build — 481+147 머지(주간 데이터 있으면 147만 신뢰, 폴백 안 함)
- [x] `helpers.ts` — cellLabel/teacherDisplayName/subjectName/searchTeachers/computeWeekDates/formatPeriodLabel/weekBadge/formatWeekLabel/lunchGroups
- [x] 단위 테스트 (vitest) — 40 통과

## 4. 프론트 UI (모바일 우선)
- [x] 5×7 그리드(세로 확장 보장, 공강 녹색/수업 색 뱃지 줄바꿈)
- [x] 주차 선택 바(금주/차주 배지)
- [x] 교사 검색·자동완성·색상 칩
- [x] 그룹 저장(그룹 추가)/불러오기/편집(순서변경·삭제)
- [x] 설정(표시 토글·학교코드·글씨크기·점심행)
- [x] 점심시간 모달 / 셀 상세 모달
- [x] 글씨 크기 전역 스케일(--scale)

## 5. 상태 영속
- [x] localStorage 저장/복원
- [x] 공유 URL(`?s=`) 인코딩/복원 + 복사 버튼
- [ ] (선택) PWA "홈 화면에 추가"

## 6. 배포
- [ ] Render 웹서비스 생성·연결 (사용자 진행)
- [ ] UptimeRobot `/healthz` 핑 등록 (사용자 진행)
- [ ] 실기기(모바일 브라우저) 확인

## 미해결/참고
- 주차 윈도우: comci `일자자료`가 현재 2주치만 반환(서버 측 한계). `nw='1'` 등 추가 조사 — 범위 외.
