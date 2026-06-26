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

export interface School {
  name: string
  code: string
  region: string
}

/** 학교 이름으로 검색 → 매칭 학교 목록(코드 포함). */
export async function searchSchools(q: string): Promise<School[]> {
  const res = await fetch(`/api/schools?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error(`학교 검색에 실패했습니다 (${res.status})`)
  return res.json()
}

export interface TrackPayload {
  visitorId: string
  nickname?: string | null
  schoolCode?: string | null
  /** 신규 접속이면 true(접속횟수 +1), 필드 갱신만이면 생략/ false. */
  count?: boolean
}

/** 집계 핑(fire-and-forget). 실패해도 UX에 영향 없음. */
export function track(payload: TrackPayload): void {
  try {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  } catch {
    /* ignore */
  }
}
