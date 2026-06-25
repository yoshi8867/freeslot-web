// 교사 색상 팔레트 — 안드로이드 TeacherPalette.kt 이식(동일 10색).
export const TEACHER_PALETTE = [
  '#5B8EDB', // 코발트 블루
  '#E8734A', // 테라코타 오렌지
  '#4CAF82', // 에메랄드 그린
  '#B85C8A', // 로즈 퍼플
  '#40A8C4', // 틸 블루
  '#D4A017', // 머스터드 골드
  '#7B6FCF', // 미드 퍼플
  '#3D9E6E', // 포레스트 그린
  '#D45F5F', // 브릭 레드
  '#5BA3A0', // 세이지 틸
] as const

export function paletteColor(orderIndex: number): string {
  return TEACHER_PALETTE[orderIndex % TEACHER_PALETTE.length]
}

/** 배경색 명도에 따라 대비 텍스트색(어두우면 흰색, 밝으면 진회색). 안드로이드 contentColorFor 이식. */
export function contentColorFor(hex: string): string {
  const { r, g, b } = hexToRgb(hex)
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return lum > 0.35 ? '#222222' : '#ffffff'
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  }
}

function lin(c: number): number {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
