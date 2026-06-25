import { formatWeekLabel, weekBadge } from '../lib/helpers'
import type { WeekInfo } from '../lib/types'

interface Props {
  weeks: WeekInfo[]
  selectedR: string
  todayR: string
  onSelect: (r: string) => void
}

export function WeekBar({ weeks, selectedR, todayR, onSelect }: Props) {
  if (weeks.length === 0) return null
  return (
    <div className="weekbar">
      <span className="label">주차:</span>
      {weeks.map((w) => {
        const active = w.r === selectedR
        const badge = weekBadge(w.r, todayR, weeks)
        return (
          <button
            key={w.r}
            className={`week-btn${active ? ' active' : ''}`}
            onClick={() => onSelect(w.r)}
          >
            {formatWeekLabel(w.label)}
            {badge && <span className="week-badge">{badge}</span>}
          </button>
        )
      })}
    </div>
  )
}
