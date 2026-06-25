import { useMemo, useState } from 'react'
import { searchTeachers, teacherDisplayName } from '../lib/helpers'
import { contentColorFor } from '../lib/palette'

interface Props {
  teachers: Array<unknown>
  teacherCount: number
  selected: number[]
  colorOf: (idx: number) => string
  onAdd: (idx: number) => void
  onRemove: (idx: number) => void
  onAddGroup: () => void
}

export function TeacherSearch({
  teachers,
  teacherCount,
  selected,
  colorOf,
  onAdd,
  onRemove,
  onAddGroup,
}: Props) {
  const [q, setQ] = useState('')
  const suggestions = useMemo(
    () => searchTeachers(teachers, teacherCount, q, selected, 10),
    [teachers, teacherCount, q, selected],
  )

  return (
    <>
      <div className="search-wrap">
        <input
          className="search-input"
          placeholder="교사 이름 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {suggestions.length > 0 && (
          <ul className="suggestions">
            {suggestions.map((s) => (
              <li
                key={s.idx}
                onClick={() => {
                  onAdd(s.idx)
                  setQ('')
                }}
              >
                {s.displayName}
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected.length > 0 && (
        <div className="chips">
          {selected.map((idx) => {
            const bg = colorOf(idx)
            return (
              <span key={idx} className="chip" style={{ background: bg, color: contentColorFor(bg) }}>
                {teacherDisplayName(teachers, idx)}
                <span className="x" onClick={() => onRemove(idx)}>
                  ✕
                </span>
              </span>
            )
          })}
          <button className="pill-btn" onClick={onAddGroup}>
            그룹 추가
          </button>
        </div>
      )}
    </>
  )
}
