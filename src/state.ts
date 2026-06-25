// 영속 상태 — localStorage 1차 저장 + 공유 URL(?s=) 복원.
// 안드로이드 PreferenceRepository에 대응. (선택 교사·그룹·학교코드·토글·글씨·점심)

export interface Group {
  name: string
  indices: number[]
}

export interface AppState {
  schoolCode: string
  selected: number[]
  groups: Group[]
  showName: boolean
  showClass: boolean
  showSubject: boolean
  fontLevel: number
  lunchEnabled: boolean
}

export const DEFAULT_SCHOOL_CODE = '16213'
export const MIN_FONT_LEVEL = 7
export const MAX_FONT_LEVEL = 16
export const DEFAULT_FONT_LEVEL = 9

export const DEFAULT_STATE: AppState = {
  schoolCode: DEFAULT_SCHOOL_CODE,
  selected: [],
  groups: [],
  showName: true,
  showClass: true,
  showSubject: true,
  fontLevel: DEFAULT_FONT_LEVEL,
  lunchEnabled: false,
}

const LS_KEY = 'freeslot-web'

export function clampFont(level: number): number {
  return Math.max(MIN_FONT_LEVEL, Math.min(MAX_FONT_LEVEL, Math.round(level)))
}

/**
 * 초기 상태 로드.
 * 우선순위: 경로의 학교코드(/{코드}) > ?s= 공유데이터 > localStorage > 기본값.
 * 로드 후 주소를 /{학교코드} 로 정규화하고 ?s=는 제거한다.
 */
export function loadInitialState(): AppState {
  let base: AppState
  const fromUrl = readShareParam()
  if (fromUrl) base = sanitize(fromUrl)
  else base = readStored() ?? { ...DEFAULT_STATE }

  const pathCode = parsePathSchoolCode()
  if (pathCode) base = sanitize({ ...base, schoolCode: pathCode })

  saveState(base)
  syncUrlToSchool(base.schoolCode)
  return base
}

function readStored(): AppState | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) return sanitize({ ...DEFAULT_STATE, ...JSON.parse(raw) })
  } catch {
    /* ignore corrupt storage */
  }
  return null
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  } catch {
    /* storage full/blocked — URL 공유로 폴백 */
  }
}

/** 현재 상태를 담은 공유 URL 생성: /{학교코드}?s={데이터}. */
export function buildShareUrl(state: AppState): string {
  return `${location.origin}/${state.schoolCode}?s=${encodeShare(state)}`
}

/** 주소창 경로를 학교코드와 그 외 공유데이터로 정규화. */
export function syncUrlToSchool(schoolCode: string): void {
  history.replaceState(null, '', `/${schoolCode}`)
}

/** 경로 첫 세그먼트가 숫자면 학교코드로 사용(/16213 → "16213"). 아니면 null. */
function parsePathSchoolCode(): string | null {
  const seg = location.pathname.split('/').filter(Boolean)[0]
  return seg && /^[0-9]+$/.test(seg) ? seg : null
}

// ── 내부 ──────────────────────────────────────────────────────────────────────

function sanitize(s: AppState): AppState {
  return {
    schoolCode: String(s.schoolCode || DEFAULT_SCHOOL_CODE).replace(/[^0-9]/g, '') || DEFAULT_SCHOOL_CODE,
    selected: Array.isArray(s.selected) ? s.selected.filter((n) => Number.isInteger(n)) : [],
    groups: Array.isArray(s.groups)
      ? s.groups
          .filter((g) => g && typeof g.name === 'string' && Array.isArray(g.indices))
          .map((g) => ({ name: g.name, indices: g.indices.filter((n) => Number.isInteger(n)) }))
      : [],
    showName: s.showName !== false,
    showClass: s.showClass !== false,
    showSubject: s.showSubject !== false,
    fontLevel: clampFont(s.fontLevel ?? DEFAULT_FONT_LEVEL),
    lunchEnabled: s.lunchEnabled === true,
  }
}

function readShareParam(): AppState | null {
  const param = new URLSearchParams(location.search).get('s')
  if (!param) return null
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(b64urlDecode(param)) }
  } catch {
    return null
  }
}

function encodeShare(state: AppState): string {
  return b64urlEncode(JSON.stringify(state))
}

function b64urlEncode(s: string): string {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(s: string): string {
  const t = s.replace(/-/g, '+').replace(/_/g, '/')
  const bin = atob(t)
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
