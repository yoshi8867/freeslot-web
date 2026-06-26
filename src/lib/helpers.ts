import { hasClass } from './schedule'
import type { TeacherSchedule, TeacherSuggestion, WeekInfo } from './types'

// ── 교사명 / 과목명 / 셀 라벨 ──────────────────────────────────────────────────

/** 교사명 표기: 끝에 '*' 없으면 추가, 있으면 유지. */
export function teacherDisplayName(teachers: Array<unknown>, teacherIdx: number): string {
  const raw = teachers[teacherIdx]
  const name = raw == null ? '' : String(raw)
  return name.endsWith('*') ? name : `${name}*`
}

/** 과목명: subjects[idx]. idx<=0이면 빈 문자열. */
export function subjectName(subjects: Array<unknown>, subjectIdx: number): string {
  if (subjectIdx <= 0) return ''
  const raw = subjects[subjectIdx]
  return raw == null ? '' : String(raw)
}

/** 학급 코드. 예: grade=2, classNum=5 → "205". (schedule.ts와 동일, 헬퍼 묶음 편의용 재노출) */
export function classCode(grade: number, classNum: number): string {
  return `${grade}${String(classNum).padStart(2, '0')}`
}

/** 셀 라벨 — 토글에 따라 성명*+학급+과목 조합. */
export function cellLabel(
  info: { teacherIdx: number; grade: number; classNum: number; subjectIdx: number },
  teachers: Array<unknown>,
  subjects: Array<unknown>,
  showName: boolean,
  showClass: boolean,
  showSubject: boolean,
): string {
  let s = ''
  if (showName) s += teacherDisplayName(teachers, info.teacherIdx)
  if (showClass) s += classCode(info.grade, info.classNum)
  if (showSubject) s += subjectName(subjects, info.subjectIdx)
  return s
}

// ── 교사 자동완성 ──────────────────────────────────────────────────────────────

/**
 * 교사 자동완성 후보. 안드로이드 searchTeachers() 이식.
 * - query trim 후 빈 문자열이면 빈 목록
 * - idx 1..teacherCount 순회, '*' 제거 이름에 query 포함 여부로 매칭
 * - 이미 선택된 교사 제외, 최대 limit건
 */
export function searchTeachers(
  teachers: Array<unknown>,
  teacherCount: number,
  query: string,
  selected: number[],
  limit = 10,
): TeacherSuggestion[] {
  const trimmed = query.trim()
  if (trimmed === '') return []

  const result: TeacherSuggestion[] = []
  const selectedSet = new Set(selected)
  for (let idx = 1; idx <= teacherCount; idx++) {
    if (result.length >= limit) break
    if (selectedSet.has(idx)) continue
    const raw = teachers[idx]
    if (raw == null) continue
    const s = String(raw)
    if (s === '') continue
    const rawName = s.endsWith('*') ? s.slice(0, -1) : s
    if (rawName.includes(trimmed)) {
      result.push({ idx, displayName: s.endsWith('*') ? s : `${s}*` })
    }
  }
  return result
}

// ── 주차 / 교시 라벨 ──────────────────────────────────────────────────────────

/**
 * 시작일("yyyy-MM-dd") → 월~금 "M/D" 5개. 파싱 실패 시 빈 문자열 5개.
 * 안드로이드 computeWeekDates() 이식(java.time 대신 JS Date).
 */
export function computeWeekDates(startDate: string): string[] {
  const parts = startDate.split('-')
  if (parts.length !== 3) return ['', '', '', '', '']
  const year = Number(parts[0])
  const month = Number(parts[1])
  const day = Number(parts[2])
  if ([year, month, day].some(Number.isNaN)) return ['', '', '', '', '']

  return Array.from({ length: 5 }, (_, i) => {
    const dt = new Date(year, month - 1, day + i)
    return `${dt.getMonth() + 1}/${dt.getDate()}`
  })
}

/**
 * 교시 라벨. "1(08:50~09:40)" → "1교시\n08:50~09:40".
 * 안드로이드 formatPeriodLabel() 이식.
 */
export function formatPeriodLabel(period: number, raw: string | null | undefined): string {
  if (raw == null) return `${period}교시`
  const timePart = raw.replace(/^\d+/, '').replace(/[()]/g, '').trim()
  return timePart === '' ? `${period}교시` : `${period}교시\n${timePart}`
}

/**
 * 주차 배지: 금주/차주/null. 안드로이드 weekBadge() 이식.
 */
export function weekBadge(weekR: string, todayR: string, weeks: WeekInfo[]): string | null {
  const todayIdx = weeks.findIndex((w) => w.r === todayR)
  if (todayIdx === -1) return null
  const weekIdx = weeks.findIndex((w) => w.r === weekR)
  if (weekIdx === todayIdx) return '금주'
  if (weekIdx === todayIdx + 1) return '차주'
  return null
}

/**
 * 주차 레이블 축약. "YY-MM-DD ~ YY-MM-DD" → "MM.DD.~". 형식 불일치 시 원문.
 * 안드로이드 formatWeekLabel() 이식.
 */
export function formatWeekLabel(label: string): string {
  const parts = label.split(' ~ ')
  if (parts.length !== 2) return label
  const p = parts[0].trim().split('-')
  if (p.length !== 3) return label
  return `${p[1]}.${p[2]}.~`
}

// ── 점심시간 ───────────────────────────────────────────────────────────────────

/** 점심 식사 시간 판정 기준 교시(4교시 수업 유무). */
export const LUNCH_REF_PERIOD = 4

/**
 * 점심시간 식사 명단 분류.
 * - 4교시 수업 없음 → 4교시에 식사(period4)
 * - 4교시 수업 있음 → 점심시간에 식사(lunch)
 */
export function lunchGroups(
  schedule: TeacherSchedule,
  selected: number[],
  day: number,
): { period4: number[]; lunch: number[] } {
  const period4: number[] = []
  const lunch: number[] = []
  for (const idx of selected) {
    if (hasClass(schedule, idx, day, LUNCH_REF_PERIOD)) lunch.push(idx)
    else period4.push(idx)
  }
  return { period4, lunch }
}
