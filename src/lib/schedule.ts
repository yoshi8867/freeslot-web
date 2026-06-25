import { DAY_RANGE, PERIOD_RANGE, type TeacherSchedule, type TimetableData } from './types'

/**
 * 시간표 셀 원시 값 → 정수. 안드로이드 parseSlot() 이식.
 * - null/undefined → null
 * - ">N" → N
 * - 숫자 파싱 불가 → 0
 */
export function parseSlot(v: unknown): number | null {
  if (v == null) return null
  const s = String(v)
  const stripped = s.startsWith('>') ? s.slice(1) : s
  const n = Number(stripped)
  return Number.isNaN(n) ? 0 : Math.trunc(n)
}

/** 학급 코드. 예: grade=2, classNum=5 → "205". */
export function classCode(grade: number, classNum: number): string {
  return `${grade}${String(classNum).padStart(2, '0')}`
}

function get4(arr: unknown, g: number, c: number, d: number, p: number): unknown {
  const a = arr as any
  return a?.[g]?.[c]?.[d]?.[p]
}

/**
 * TimetableData → 교사별 시간표. 안드로이드 ScheduleBuilder.build() 이식.
 *
 * 핵심: 자료147(주간시간표)이 그 주차에 등록돼 있으면 그것이 실제 시간표다.
 * 운영 주차는 자료147에 그 주 전체 시간표(기본표 복사본)를 싣고, 방학·휴업일은 비운다(null).
 * 따라서 자료147이 있는 주차에선 자료147만 신뢰하고(빈 칸=공강), 기본표로 메우지 않는다.
 * 자료147이 통째로 없는 주차에서만 기본표 자료481로 대체한다.
 * (period 0은 더미이므로 실제 교시 PERIOD_RANGE만 보고 등록 여부 판단.)
 */
export function build(data: TimetableData): TeacherSchedule {
  const sep = data.separator
  const result: TeacherSchedule = new Map()

  const weekHasChange = hasWeeklyData(data)

  for (let g = 1; g <= 3; g++) {
    const classCount = data.classCounts[g] ?? 0
    for (let c = 1; c <= classCount; c++) {
      for (const d of DAY_RANGE) {
        for (const p of PERIOD_RANGE) {
          const r147 = parseSlot(get4(data.change, g, c, d, p))
          const r481 = parseSlot(get4(data.base, g, c, d, p))

          // 주간 데이터 있는 주: 자료147만(없는 칸=공강). 없는 주: 기본표.
          const raw = weekHasChange ? r147 ?? 0 : r481 ?? 0
          if (raw <= 0) continue

          const teacher = raw % sep
          const subject = Math.trunc(raw / sep)
          if (teacher < 1 || teacher > data.teacherCount) continue

          let byDay = result.get(teacher)
          if (!byDay) {
            byDay = new Map()
            result.set(teacher, byDay)
          }
          let byPeriod = byDay.get(d)
          if (!byPeriod) {
            byPeriod = new Map()
            byDay.set(d, byPeriod)
          }
          byPeriod.set(p, { teacherIdx: teacher, grade: g, classNum: c, subjectIdx: subject })
        }
      }
    }
  }

  return result
}

/**
 * 자료147에 실제 교시(1..7) 데이터가 한 칸이라도 있으면 true(주간 운영 주차).
 *
 * comci 4D 배열은 각 레벨 index 0이 스칼라(개수 등)라 for-of로 순회하면 비배열을 만나 터진다.
 * build()와 동일하게 1-based 인덱스 + 옵셔널 체이닝(get4)으로만 접근한다.
 */
function hasWeeklyData(data: TimetableData): boolean {
  for (let g = 1; g <= 3; g++) {
    const classCount = data.classCounts[g] ?? 0
    for (let c = 1; c <= classCount; c++) {
      for (const d of DAY_RANGE) {
        for (const p of PERIOD_RANGE) {
          if (get4(data.change, g, c, d, p) != null) return true
        }
      }
    }
  }
  return false
}

/** 한 교사가 특정 (요일,교시)에 수업이 있는지. */
export function hasClass(
  schedule: TeacherSchedule,
  teacherIdx: number,
  day: number,
  period: number,
): boolean {
  return schedule.get(teacherIdx)?.get(day)?.get(period) != null
}

/** 선택 교사 중 그 (요일,교시)에 수업이 있는 교사 인덱스 목록(없으면 공강). */
export function busyTeachers(
  schedule: TeacherSchedule,
  selected: number[],
  day: number,
  period: number,
): number[] {
  return selected.filter((idx) => hasClass(schedule, idx, day, period))
}
