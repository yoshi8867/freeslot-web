import type { TimetableData, WeekInfo } from './types'

/**
 * 컴시간 응답 객체 → TimetableData. 안드로이드 TimetableParser.kt 이식.
 *
 * trailing garbage 제거는 서버가 처리하므로 여기선 이미 파싱된 객체를 받는다.
 * sparse 4D 배열(자료481/자료147)은 원본 중첩 배열 그대로 보존하고,
 * 접근은 schedule.build에서 옵셔널 체이닝으로 null-safe 하게 한다.
 */
export function parseTimetable(obj: Record<string, unknown>): TimetableData {
  const sepRaw = toNum(obj['분리'], 1000)
  const separator = sepRaw === 0 ? 1000 : sepRaw

  return {
    separator,
    teacherCount: toNum(obj['교사수'], 0),
    teachers: asArray(obj['자료446']) as Array<string | number | null>,
    subjects: asArray(obj['자료492']) as Array<string | number | null>,
    classCounts: asArray(obj['학급수']).map((v) => toNum(v, 0)),
    periodTimes: asArray(obj['일과시간']).map((v) => (v == null ? '' : String(v))),
    weeks: parseWeeks(obj['일자자료']),
    todayR: obj['오늘r'] == null ? '' : String(obj['오늘r']),
    startDate: obj['시작일'] == null ? '' : String(obj['시작일']),
    base: asArray(obj['자료481']) as TimetableData['base'],
    change: asArray(obj['자료147']) as TimetableData['change'],
  }
}

/** '일자자료' [[r, label], ...] → WeekInfo[] */
function parseWeeks(raw: unknown): WeekInfo[] {
  return asArray(raw).map((item) => {
    const arr = asArray(item)
    return {
      r: arr[0] == null ? '' : String(arr[0]),
      label: arr[1] == null ? '' : String(arr[1]),
    }
  })
}

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : []
}

function toNum(v: unknown, fallback: number): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isNaN(n) ? fallback : n
  }
  return fallback
}
