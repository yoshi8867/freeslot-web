# freeslot-web (공강찾기 웹)

컴시간알리미 API로 여러 교사의 **공통 공강(빈 시간)** 을 찾아주는 모바일 우선 웹앱.
안드로이드 앱 `free_slot`(`com.yongsanhighschool.freeslot`)의 웹 포팅판.

## 구조

```
freeslot-web/
├── server/index.js     # Express: /api/timetable 프록시 + /healthz + 정적(dist) 서빙
├── src/
│   ├── lib/            # 순수 로직(이식): parser, schedule, helpers, palette, types (+ *.test.ts)
│   ├── components/     # TimetableGrid, WeekBar, TeacherSearch, GroupBar, Modals
│   ├── api.ts          # /api/timetable 호출 → TimetableData
│   ├── state.ts        # localStorage + 공유 URL(?s=) 영속
│   └── App.tsx
└── render.yaml         # Render 배포 설정
```

### 왜 서버가 필요한가
브라우저는 comci.net을 직접 못 부른다: HTTPS↔HTTP **mixed content** 차단 + **CORS** 미허용.
→ Express가 server-to-server로 호출·파싱해 JSON으로 중계한다.

## 개발

```bash
npm install
npm run dev      # vite(클라이언트 5173) + express(3001) 동시 실행. vite가 /api를 3001로 프록시
npm test         # vitest 단위 테스트(이식 로직)
```

## 배포 (Render)

- 단일 웹서비스. `buildCommand: npm install && npm run build`, `startCommand: npm start`.
- Sleep 방지: UptimeRobot(무료, 5분)으로 `/healthz` 핑.
- 환경변수: `PORT`(Render 제공). 매직넘버 회전 시 `COMCI_ROUTE`/`COMCI_PREFIX`로 덮어쓰기.

## 메모

- 컴시간 데이터 응답은 **UTF-8**(EUC-KR 아님). 서버가 UTF-8 디코딩 후 trailing garbage(`}` 뒤) 제거.
- `자료147`(주간시간표)이 있는 주차는 그것이 진실 — 빈 요일은 공강(기본표로 안 메움). [ScheduleBuilder 참고]
- 주차는 comci 서버가 현재 2주치(이번주/다음주)만 제공.
