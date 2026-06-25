import { describe, expect, it } from 'vitest'
import real from './__fixtures__/real.json'
import { parseTimetable } from './parser'
import { build, busyTeachers } from './schedule'

// 실 comci 응답 스냅샷 — 4D 배열의 index 0 스칼라 등 실제 구조 회귀 방지.
describe('real comci data', () => {
  it('parse + build do not throw and produce schedules', () => {
    const data = parseTimetable(real as any)
    expect(data.teacherCount).toBeGreaterThan(0)
    const schedule = build(data)
    expect(schedule.size).toBeGreaterThan(0)
    // 임의 교사의 (월,1교시) 조회가 예외 없이 동작
    const someTeacher = [...schedule.keys()][0]
    expect(() => busyTeachers(schedule, [someTeacher], 1, 1)).not.toThrow()
  })
})
