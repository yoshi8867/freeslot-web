# freeslot-web — 오케스트레이터 핸드오프 브리프

> 안드로이드 앱 **공강찾기**(`dev/free_slot`, `com.yongsanhighschool.freeslot`)와 **동일 기능을 하는 웹 버전**을 새로 만든다.
> 이 문서 하나로 plan → 구현 전 과정을 진행할 수 있도록 모든 결정·기술조사 결과를 담았다.
> 작성: 기술검토 fork 세션 (2026-06-25). 모든 협의는 사용자와 합의 완료.

---

## 0. 한 줄 목표

컴시간알리미 API로 **여러 교사의 공통 공강(빈 시간)을 찾아주는** 안드로이드 앱을, **모바일 브라우저에서 접근 가능한 웹앱**으로 포팅한다. UI도 비슷하게. Render에 배포.

---

## 1. 확정 사항 (사용자 합의 완료 — 재논의 불필요)

| 항목 | 결정 |
|------|------|
| **프로젝트 위치** | `dev/freeslot-web/` (새 폴더, **새 git repo**, **새 GitHub repo**. 안드로이드 `free_slot`과 완전 별개) |
| **백엔드** | Node + Express (Render 배포). 기존 `board/`·`together-ledger-server/` 컨벤션과 일관 |
| **프론트엔드** | React + Vite, **모바일 우선** UI |
| **저장 방식** | **localStorage + 공유 URL** (DB·로그인 없음) |
| **배포** | Render 단일 웹서비스 (API + 정적 동시 서빙) |
| **Sleep 방지** | `/healthz` 엔드포인트 + UptimeRobot 5분 핑 |

---

## 2. 합의된 아키텍처

```
[모바일 브라우저] ──HTTPS──> [Render: Express 단일 서비스]
   React SPA                  ├─ GET /api/timetable?school=&r=  → comci.net 프록시+파싱+JSON 반환
   localStorage + URL상태      ├─ GET /healthz                   → 200 "ok" (UptimeRobot 핑 대상)
                              └─ 정적 서빙 (Vite build 산출물 dist/)
                                        │ server-to-server (HTTP) — CORS/mixed-content 회피
                                        ▼
                                 http://comci.net:4082
```

### 왜 정적 페이지만으론 안 되고 서버가 필요한가 (중요)
브라우저에서 comci.net을 **직접 호출 불가**:
1. **Mixed content**: Render는 HTTPS인데 comci.net은 **HTTP 전용**(`http://comci.net:4082`) → 브라우저 차단.
2. **CORS**: comci.net은 CORS 헤더를 안 줌 → cross-origin fetch 거부.

→ **Express 서버가 프록시**로서 server-to-server로 comci.net을 호출하고 파싱해서 프론트에 JSON을 준다. 이것이 서버가 필요한 핵심 이유.

---

## 3. 컴시간알리미 API 명세 (기술조사로 확인한 실측값)

### 3.1 엔드포인트
- **베이스**: `http://comci.net:4082/`
- **데이터 요청**: `GET http://comci.net:4082/36179_T?{base64}`
  - `{base64}` = base64(`73629_{schoolCode}_0_{r}`) — `NO_WRAP`(개행 없음)
  - 예: schoolCode=`16213`, r=`` → payload `73629_16213_0_` → base64 `NzM2MjlfMTYyMTNfMF8=`
  - 최종 URL: `http://comci.net:4082/36179_T?NzM2MjlfMTYyMTNfMF8=`
- **로더(매직넘버 출처)**: `GET http://comci.net:4082/st` (EUC-KR HTML/JS). 여기서 라우트 번호·prefix를 추출.

### 3.2 매직넘버 (2026-06-25 기준 유효 확인됨)
- 라우트 prefix: **`36179`** (`36179_T?...`, `./36179?...`)
- sc_data prefix: **`73629_`**
- 로더의 실제 JS:
  ```js
  function sc_data(sc,sc2,r,nw){
    var da1='0';
    if(nw=='0' && (storage.sc==sc2 && storage.r==r)) {da1=H시간표.자료244;}
    var s7=sc+sc2;
    var sc3='./36179?'+btoa(s7+'_'+da1+'_'+r);   // 즉 73629_{school}_{da1}_{r}
    ...
  }
  ```
  → 우리가 쓰는 `73629_{school}_0_{r}` 형식과 일치(da1=0).
- **로더와 하드코딩 값이 일치 → 매직넘버는 스테일 아님.**
- **[선택 견고화 항목]** 매직넘버는 comci.net이 주기적으로 회전시킬 수 있음. plan에서 "`/st` 로더를 파싱해 `36179`/`73629_`를 런타임 추출 → 캐시" 하는 방어 로직을 넣을지 검토. (지금 당장은 하드코딩으로도 동작)

### 3.3 ⚠️ 인코딩 — 응답은 **UTF-8** (EUC-KR 아님)
- 안드로이드 앱은 `EucKrInterceptor`로 EUC-KR 디코딩 중인데, **실측 결과 데이터 응답은 UTF-8**이다.
  - euc-kr/cp949 디코딩은 `0x90` 등에서 실패, UTF-8로는 정상 디코딩됨(교사명 한글 정상).
  - (로더 `/st`만 EUC-KR HTML.)
- **웹 서버에서는 응답을 UTF-8로 디코딩.** 단, 방어적으로 디코딩 실패 시 fallback 두는 것 권장.

### 3.4 응답 JSON 주요 필드 (실측)
trailing garbage 존재 → `lastIndexOf('}')+1` 까지 잘라서 파싱.

| 필드 | 의미 | 예시(2026-06-25, school 16213) |
|------|------|------|
| `교사수` | 교사 수 | `65` |
| `자료446` | 교사명 배열 (idx 0 = "", 1..N = 이름. 일부 끝에 `*` 포함) | `["","홍영*","조연*","박해*",...]` |
| `자료492` | 과목 배열 (idx 0 = 과목 수, 1..N = 과목명) | |
| `학급수` | `[총계, 1학년반수, 2학년반수, 3학년반수]` | |
| `일과시간` | 교시별 시간 문자열 | `"1(08:50~09:40)"` 형태 |
| `일자자료` | **주차 목록** `[[r, "YY-MM-DD ~ YY-MM-DD"], ...]` | `[[1,"26-06-22 ~ 26-06-27"],[2,"26-06-29 ~ 26-07-04"]]` |
| `오늘r` | 금주 r 식별자 | `1` |
| `시작일` | 선택 주차 월요일 날짜 | `2026-06-22` |
| `자료481` | **기본 시간표** sparse 4D `[학년][반][요일][교시]→Int?` | |
| `자료147` | **변경 시간표** sparse 4D, 값 Int/">N"/0/null 혼재 → Any? | |
| `분리` | 분리 상수(0이면 1000으로) | |

- 요일 1=월..5=금, 교시 1..7.

---

## 4. 안드로이드(Kotlin) → TypeScript 이식 대상

원본 위치: `dev/free_slot/app/src/main/java/com/yongsanhighschool/freeslot/`
순수 로직이라 그대로 포팅하면 됨(단위 테스트도 같이 이식 권장):

- **`data/parser/TimetableParser.kt`** → 응답 JSON → 구조화 데이터. (UTF-8, trailing garbage strip, sparse 4D 파싱, `일자자료`/`오늘r`/`시작일`)
- **`data/schedule/ScheduleBuilder.kt`** (`build`) → 교사별 시간표(`TeacherSchedule`) 구성. **자료481(기본)에 자료147(변경) 덮어쓰기 로직 포함** — 원본 확인해서 정확히 이식.
- **`ui/components/TimetableGrid.kt`의 순수 헬퍼**: `cellLabel`, `teacherDisplayName`, `subjectName`
- **공강(빈 시간) 판정**: 선택 교사 전원이 해당 (요일,교시)에 수업 없음 → 공강. (그리드에서 녹색 셀 `{요일}{교시}`)
- **점심시간 로직** (`LunchDetailDialog.kt`): 4교시 수업 **없는** 교사 = 4교시 식사 / 4교시 수업 **있는** 교사 = 점심시간 식사. 토글로 4·5교시 사이 점심 행 표시.
- **`ui/MainViewModel.kt`의 순수 헬퍼**: `searchTeachers`(자동완성), `computeWeekDates`(시작일→월~금 M/D, java.time 대신 JS Date), `formatPeriodLabel`("1(08:50~09:40)"→"1교시\n08:50~09:40")
- **`ui/components/WeekBar.kt` 헬퍼**: `weekBadge`(금주/차주), `formatWeekLabel`("YY-MM-DD ~ ..."→"MM.DD.~")

---

## 5. UI 요구사항 (안드로이드 앱과 비슷하게, 모바일 우선)

- **5×7 시간표 그리드** (요일 월~금 × 1~7교시). 가로 스크롤 없이 5열 균등.
  - 공강 셀: 연녹색 배경 + 중앙 `{요일}{교시}` (예: `월5`)
  - 수업 셀: 교사별 색상 뱃지 나열(넘치면 줄바꿈). **데이터 많으면 셀이 세로로 늘어나 전부 표시**(잘리면 안 됨 — 안드로이드에서 실제 겪은 이슈).
  - 라벨 = 교사명* + 학급코드 + 과목명 (표시 토글로 on/off)
- **주차 선택 바**: `일자자료` 순회, 금주/차주 배지, 선택 주차 강조. 클릭 시 해당 r 재요청.
- **교사 추가**: 자동완성 검색 → 칩으로 추가, 교사별 색상 배정.
- **그룹**: 현재 선택 교사를 이름 붙여 저장 / 불러오기 / 순서변경 / 삭제(편집 모달).
- **설정**: 표시 토글(교사명·학급·과목), 학교 코드(기본 `16213`), 글씨 크기, 점심시간 행 on/off.

---

## 6. 저장 전략 — localStorage + 공유 URL (Safari ITP 대응)

### 배경 (기술검토 결과)
- `localStorage`는 삼성인터넷·iOS Safari **모두 지원**. 기본 지원은 문제 없음.
- **진짜 함정 = iOS Safari ITP**: JS로 쓴 localStorage를 **7일 미방문 시 삭제**할 수 있음 → 저장한 그룹이 방학/연휴에 날아갈 위험. (삼성인터넷=Chromium은 이 강제삭제 없음.)
- 시크릿 모드는 세션 종료 시 소실. IndexedDB로 바꿔도 ITP 규칙 동일 → 해결 안 됨.

### 채택안
1. **1차 저장 = localStorage** (선택 교사·그룹·학교코드·토글·글씨크기·점심 토글). 구현 단순.
2. **상태를 URL에 인코딩** → 북마크/공유 링크로 복원. 스토리지 삭제·시크릿 모드에도 견고하고, **"동료에게 공유" 목적과 정확히 일치**.
   - compact JSON → base64 → `?s=...` 쿼리 파라미터.
   - **교사 인덱스는 학교별 고유**이므로 반드시 `schoolCode`와 함께 인코딩.
   - 앱 로드 시: URL `?s=` 있으면 그걸 우선 적용 → localStorage에도 반영.
3. **[선택] PWA "홈 화면에 추가"** 지원: Safari도 설치형 웹앱엔 영구 스토리지를 줘 ITP 7일 삭제 회피 + 앱 느낌. manifest + service worker(최소).

---

## 7. 배포 / 운영

- **Render 단일 웹서비스**: Express가 `/api/*` + `/healthz` + 정적(`dist/`) 모두 서빙. (프론트/백 분리 배포 아님 — 한 서비스로 CORS·도메인 단순화)
- **빌드**: Vite build → `dist/` → Express `express.static`.
- **Sleep 방지**:
  - `GET /healthz → 200 "ok"` 추가.
  - **UptimeRobot**(무료, 5분 간격, 모니터 50개)에 `/healthz` 등록. ← 추천.
  - self-ping(setInterval)은 sleep 시 타이머도 멈춰 **무의미**. GitHub Actions cron은 지연 크고 60일 비활성 시 비활성화 → 비추.
- **750시간 한도 주의**: 항상 깨워두면 월 ~720–744h 소진 → **무료 웹서비스는 이 앱 1개만** 띄우면 한도 내 안전.
- 환경변수: `PORT`(Render 제공), 학교코드·매직넘버는 기본값 두되 설정/환경변수로 덮어쓰기 가능하게.

---

## 8. 로드맵 스켈레톤 (plan에서 구체화)

1. **세팅**: `dev/freeslot-web/` 폴더, git init, Express+Vite(React+TS) 모노 구조(server/ + client/), `/healthz`, README.
2. **백엔드 프록시**: `/api/timetable?school=&r=` — comci.net 호출(UTF-8), 파싱, JSON 반환. 매직넘버/쿼리 빌드. (선택: 로더 동적 추출)
3. **로직 이식 + 테스트**: parser / scheduleBuilder(481+147 머지) / 공강·점심·자동완성·주차·라벨 헬퍼 → TS + 단위테스트.
4. **프론트 UI**: 그리드(세로 확장 보장) / 주차바 / 교사검색·칩 / 그룹 편집 / 설정. 모바일 우선 스타일.
5. **상태 영속**: localStorage + URL 인코딩(`?s=`). (선택: PWA)
6. **배포**: Render 설정(빌드·스타트 커맨드), 정적 서빙, GitHub push, UptimeRobot 연결.

> 안드로이드 파이프라인 규약 준수: ROADMAP.md 단일 소스([ ]/[~]/[x]), 사용자 테스트 게이트 통과 전 commit 금지, **push는 사용자 승인 후**.

---

## 9. 미해결/주의 (참고)

- **주차 윈도우 이슈(별건, 천천히 처리하기로 함)**: comci.net `일자자료`가 현재 **2주치만**(이번주 r=1, 다음주 r=2) 반환. 사용자가 원하는 `07-06~07-11`은 아직 서버 윈도우 밖이라 안 나옴. 클럭/매직넘버 문제 아님(실시각 2026-06-25 14:13 KST 웹 확인). `nw='1'` 파라미터 등으로 더 받을 수 있는지는 추후 조사 — **이번 웹 포팅 범위 외**.
- 안드로이드 `EucKrInterceptor`는 사실 UTF-8 응답을 처리 중 → 웹은 처음부터 UTF-8로.
