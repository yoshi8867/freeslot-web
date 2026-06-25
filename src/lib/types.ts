// 컴시간 도메인 모델 — 안드로이드 TimetableData.kt 이식.

export interface WeekInfo {
  /** 주차 식별자 (API r 파라미터) */
  r: string
  /** 주차 레이블 (예: "26-06-22 ~ 26-06-27") */
  label: string
}

export interface TimetableData {
  /** '분리' 상수 (0이면 1000). teacher = raw % sep, subject = raw / sep */
  separator: number
  /** '교사수' */
  teacherCount: number
  /** '자료446' — idx 0은 더미, 1..N이 교사명(일부 끝에 '*') */
  teachers: Array<string | number | null>
  /** '자료492' — idx 0은 과목 수, 1..N이 과목명 */
  subjects: Array<string | number | null>
  /** '학급수' — [총계, 1학년, 2학년, 3학년] */
  classCounts: number[]
  /** '일과시간' — 교시별 시간 문자열 */
  periodTimes: string[]
  /** '일자자료' — 주차 목록 */
  weeks: WeekInfo[]
  /** '오늘r' — 금주 식별자 */
  todayR: string
  /** '시작일' — 선택 주 월요일 (yyyy-MM-dd) */
  startDate: string
  /** '자료481' — 기본 시간표 sparse 4D [학년][반][요일][교시] */
  base: Array<Array<Array<Array<number | null>>>>
  /** '자료147' — 변경(주간) 시간표 sparse 4D. 값 number/">N"/0/null 혼재 */
  change: Array<Array<Array<Array<unknown>>>>
}

/** 시간표 한 칸 — 어떤 교사가 어느 학년·반에서 어떤 과목을 가르치는지. */
export interface ClassInfo {
  teacherIdx: number
  grade: number
  classNum: number
  subjectIdx: number
}

/** 교사 인덱스 → 요일 → 교시 → ClassInfo. 없으면 공강. */
export type TeacherSchedule = Map<number, Map<number, Map<number, ClassInfo>>>

/** 교사 자동완성 후보. */
export interface TeacherSuggestion {
  idx: number
  displayName: string
}

export const DAY_RANGE = [1, 2, 3, 4, 5] as const
export const PERIOD_RANGE = [1, 2, 3, 4, 5, 6, 7] as const
export const DAY_NAMES = ['월', '화', '수', '목', '금'] as const
