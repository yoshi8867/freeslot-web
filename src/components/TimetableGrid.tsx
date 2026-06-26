import { cellLabel } from '../lib/helpers'
import { busyTeachers } from '../lib/schedule'
import { DAY_NAMES, DAY_RANGE, PERIOD_RANGE, type TeacherSchedule } from '../lib/types'
import { contentColorFor } from '../lib/palette'

interface Props {
  schedule: TeacherSchedule
  selected: number[]
  teachers: Array<unknown>
  subjects: Array<unknown>
  weekDates: string[]
  periodLabels: string[]
  colorOf: (idx: number) => string
  showName: boolean
  showClass: boolean
  showSubject: boolean
  showLunchRow: boolean
  /** 본인 교사 인덱스(id). 일치 뱃지는 강조. */
  myTeacherIdx: number | null
  onLunchClick: (day: number) => void
  onCellClick: (day: number, period: number) => void
}

export function TimetableGrid(props: Props) {
  const { schedule, selected, weekDates, periodLabels, showLunchRow } = props

  const cells: React.ReactNode[] = []

  // 헤더 행
  cells.push(
    <div className="cell header period" key="h-corner">
      <span className="day">교시</span>
    </div>,
  )
  for (const d of DAY_RANGE) {
    cells.push(
      <div className="cell header" key={`h-${d}`}>
        <span className="day">{DAY_NAMES[d - 1]}</span>
        {weekDates[d - 1] ? <span className="date">{weekDates[d - 1]}</span> : null}
      </div>,
    )
  }

  // 교시 행
  for (const p of PERIOD_RANGE) {
    cells.push(
      <div className="cell period" key={`p-${p}`}>
        {periodLabels[p - 1] ?? `${p}교시`}
      </div>,
    )
    for (const d of DAY_RANGE) {
      cells.push(<DataCell key={`c-${d}-${p}`} day={d} period={p} {...props} />)
    }

    // 4·5교시 사이 점심 행
    if (showLunchRow && p === 4) {
      cells.push(
        <div className="cell lunch-label" key="lunch-label">
          점심
        </div>,
      )
      for (const d of DAY_RANGE) {
        cells.push(
          <div
            className="cell lunch clickable"
            key={`lunch-${d}`}
            onClick={() => props.onLunchClick(d)}
          />,
        )
      }
    }
  }

  void schedule
  void selected
  return <div className="grid">{cells}</div>
}

function DataCell(props: Props & { day: number; period: number }) {
  const {
    schedule,
    selected,
    teachers,
    subjects,
    day,
    period,
    colorOf,
    showName,
    showClass,
    showSubject,
    myTeacherIdx,
    onCellClick,
  } = props

  if (selected.length === 0) return <div className="cell" />

  const busy = busyTeachers(schedule, selected, day, period)

  if (busy.length === 0) {
    return (
      <div className="cell free">
        <span>
          {DAY_NAMES[day - 1]}
          {period}
        </span>
      </div>
    )
  }

  const allOff = !showName && !showClass && !showSubject
  return (
    <div className="cell clickable" onClick={() => onCellClick(day, period)}>
      {busy.map((idx) => {
        const bg = colorOf(idx)
        if (allOff) {
          return (
            <span
              key={idx}
              className="badge"
              style={{ background: bg, width: 12, height: 12, padding: 0, borderRadius: '50%' }}
            />
          )
        }
        const info = schedule.get(idx)!.get(day)!.get(period)!
        const label = cellLabel(info, teachers, subjects, showName, showClass, showSubject)
        const isMe = idx === myTeacherIdx
        return (
          <span
            key={idx}
            className={isMe ? 'badge me' : 'badge'}
            style={{ background: bg, color: contentColorFor(bg) }}
          >
            {label}
          </span>
        )
      })}
    </div>
  )
}
