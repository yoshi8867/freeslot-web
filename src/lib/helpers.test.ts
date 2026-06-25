import { describe, expect, it } from 'vitest'
import {
  cellLabel,
  computeWeekDates,
  formatPeriodLabel,
  formatWeekLabel,
  searchTeachers,
  subjectName,
  teacherDisplayName,
  weekBadge,
} from './helpers'
import type { WeekInfo } from './types'

const teachers = ['', '홍길', '김철*', '이영']

describe('teacherDisplayName', () => {
  it('adds * when missing', () => expect(teacherDisplayName(teachers, 1)).toBe('홍길*'))
  it('keeps existing *', () => expect(teacherDisplayName(teachers, 2)).toBe('김철*'))
  it('missing idx → "*"', () => expect(teacherDisplayName(teachers, 9)).toBe('*'))
})

describe('subjectName', () => {
  const subjects = ['3', '국어', '수학', '영어']
  it('idx 0 → ""', () => expect(subjectName(subjects, 0)).toBe(''))
  it('idx 2 → 수학', () => expect(subjectName(subjects, 2)).toBe('수학'))
})

describe('cellLabel', () => {
  const subjects = ['2', '국어', '수학']
  const info = { teacherIdx: 1, grade: 2, classNum: 5, subjectIdx: 2 }
  it('all on', () => expect(cellLabel(info, teachers, subjects, true, true, true)).toBe('홍길*205수학'))
  it('name only', () => expect(cellLabel(info, teachers, subjects, true, false, false)).toBe('홍길*'))
  it('class only', () => expect(cellLabel(info, teachers, subjects, false, true, false)).toBe('205'))
  it('all off', () => expect(cellLabel(info, teachers, subjects, false, false, false)).toBe(''))
})

describe('searchTeachers', () => {
  const list = ['', '홍길동', '김철수', '홍판서']
  it('empty query → []', () => expect(searchTeachers(list, 3, '  ', [])).toEqual([]))
  it('matches by substring, excludes selected', () => {
    const r = searchTeachers(list, 3, '홍', [1])
    expect(r.map((x) => x.idx)).toEqual([3])
    expect(r[0].displayName).toBe('홍판서*')
  })
  it('respects limit', () => {
    expect(searchTeachers(list, 3, '홍', [], 1)).toHaveLength(1)
  })
})

describe('computeWeekDates', () => {
  it('Mon-Fri from start date', () => {
    expect(computeWeekDates('2026-06-29')).toEqual(['6/29', '6/30', '7/1', '7/2', '7/3'])
  })
  it('bad input → 5 empties', () => {
    expect(computeWeekDates('nope')).toEqual(['', '', '', '', ''])
  })
})

describe('formatPeriodLabel', () => {
  it('parses time', () => expect(formatPeriodLabel(1, '1(08:50~09:40)')).toBe('1교시\n08:50~09:40'))
  it('null → 교시 only', () => expect(formatPeriodLabel(3, null)).toBe('3교시'))
})

describe('weekBadge', () => {
  const weeks: WeekInfo[] = [
    { r: '1', label: 'a' },
    { r: '2', label: 'b' },
    { r: '3', label: 'c' },
  ]
  it('today → 금주', () => expect(weekBadge('1', '1', weeks)).toBe('금주'))
  it('next → 차주', () => expect(weekBadge('2', '1', weeks)).toBe('차주'))
  it('other → null', () => expect(weekBadge('3', '1', weeks)).toBeNull())
  it('unknown todayR → null', () => expect(weekBadge('1', 'x', weeks)).toBeNull())
})

describe('formatWeekLabel', () => {
  it('shortens', () => expect(formatWeekLabel('26-06-22 ~ 26-06-27')).toBe('06.22.~'))
  it('malformed → original', () => expect(formatWeekLabel('weird')).toBe('weird'))
})
