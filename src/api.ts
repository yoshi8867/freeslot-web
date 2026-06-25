import { parseTimetable } from './lib/parser'
import type { TimetableData } from './lib/types'

/** 서버 프록시로 시간표를 받아 TimetableData로 파싱. */
export async function fetchTimetable(school: string, r = ''): Promise<TimetableData> {
  const res = await fetch(
    `/api/timetable?school=${encodeURIComponent(school)}&r=${encodeURIComponent(r)}`,
  )
  if (!res.ok) {
    let detail = ''
    try {
      detail = (await res.json())?.detail ?? ''
    } catch {
      /* ignore */
    }
    throw new Error(`시간표를 불러오지 못했습니다 (${res.status})${detail ? `: ${detail}` : ''}`)
  }
  return parseTimetable(await res.json())
}
