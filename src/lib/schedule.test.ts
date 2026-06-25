import { describe, expect, it } from 'vitest'
import { build, classCode, parseSlot } from './schedule'
import type { TimetableData } from './types'

// sparse 4D 한 칸만 채운 배열 생성 [g][c][d][p] = value
function cell4d<T>(g: number, c: number, d: number, p: number, value: T): T[][][][] {
  const out: T[][][][] = []
  for (let gi = 0; gi <= g; gi++) {
    out[gi] = []
    for (let ci = 0; ci <= Math.max(c, 2); ci++) {
      out[gi][ci] = []
      for (let di = 0; di <= 5; di++) {
        out[gi][ci][di] = []
        for (let pi = 0; pi <= 8; pi++) {
          out[gi][ci][di][pi] = (gi === g && ci === c && di === d && pi === p ? value : null) as T
        }
      }
    }
  }
  return out
}

function makeData(over: Partial<TimetableData>): TimetableData {
  return {
    separator: 1000,
    teacherCount: 100,
    teachers: [],
    subjects: [],
    classCounts: [0, 2, 2, 2],
    periodTimes: [],
    weeks: [],
    todayR: '',
    startDate: '',
    base: [],
    change: [],
    ...over,
  }
}

describe('parseSlot', () => {
  it('null → null', () => expect(parseSlot(null)).toBeNull())
  it('undefined → null', () => expect(parseSlot(undefined)).toBeNull())
  it('">12" → 12', () => expect(parseSlot('>12')).toBe(12))
  it('"12" → 12', () => expect(parseSlot('12')).toBe(12))
  it('12 → 12', () => expect(parseSlot(12)).toBe(12))
  it('0 → 0', () => expect(parseSlot(0)).toBe(0))
  it('"abc" → 0', () => expect(parseSlot('abc')).toBe(0))
  it('">88065" → 88065', () => expect(parseSlot('>88065')).toBe(88065))
})

describe('classCode', () => {
  it('2,5 → 205', () => expect(classCode(2, 5)).toBe('205'))
  it('1,10 → 110', () => expect(classCode(1, 10)).toBe('110'))
  it('3,1 → 301', () => expect(classCode(3, 1)).toBe('301'))
})

describe('build', () => {
  it('registers entry from base when no weekly change', () => {
    const data = makeData({ base: cell4d(1, 1, 1, 1, 88065), change: [] })
    const info = build(data).get(65)?.get(1)?.get(1)
    expect(info).toEqual({ teacherIdx: 65, grade: 1, classNum: 1, subjectIdx: 88 })
  })

  it('change takes priority over base', () => {
    const data = makeData({
      base: cell4d(1, 1, 1, 1, 88065),
      change: cell4d(1, 1, 1, 1, 2001),
    })
    const schedule = build(data)
    expect(schedule.get(1)?.get(1)?.get(1)?.teacherIdx).toBe(1)
    expect(schedule.get(65)?.get(1)?.get(1)).toBeUndefined()
  })

  it('change 0 clears the slot (cancelled)', () => {
    const data = makeData({
      base: cell4d(1, 1, 1, 1, 88065),
      change: cell4d(1, 1, 1, 1, 0),
    })
    expect(build(data).get(65)?.get(1)?.get(1)).toBeUndefined()
  })

  it('skips teacher index out of range', () => {
    const data = makeData({ base: cell4d(1, 1, 1, 1, 88999) })
    expect(build(data).get(999)).toBeUndefined()
  })

  it('skips period 8 (outside 1..7)', () => {
    const data = makeData({ base: cell4d(1, 1, 1, 8, 1065) })
    expect(build(data).get(65)?.get(1)?.get(8)).toBeUndefined()
  })

  it('gt-prefix change decoded', () => {
    const data = makeData({ change: cell4d(2, 1, 3, 5, '>88065') })
    const info = build(data).get(65)?.get(3)?.get(5)
    expect(info).toEqual({ teacherIdx: 65, grade: 2, classNum: 1, subjectIdx: 88 })
  })

  it('does not fall back to base on a day absent from a registered week', () => {
    // base에는 (1,1,1,1) 수업, change는 다른 칸(1,1,2,1)에만 등록 → 운영 주차.
    // 따라서 (1,1,1,1)은 자료147에 없으므로 기본표 폴백 없이 공강.
    const base = cell4d(1, 1, 1, 1, 88065)
    const change = cell4d(1, 1, 2, 1, 2001)
    const schedule = build(makeData({ base, change }))
    expect(schedule.get(1)?.get(2)?.get(1)?.teacherIdx).toBe(1) // 등록된 칸
    expect(schedule.get(65)?.get(1)?.get(1)).toBeUndefined() // 폴백 안 됨
  })
})
