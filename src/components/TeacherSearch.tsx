import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  const suggestions = useMemo(
    () => searchTeachers(teachers, teacherCount, q, selected, 10),
    [teachers, teacherCount, q, selected],
  )

  // 검색어가 바뀌면 활성 항목을 첫 번째로 초기화
  useEffect(() => setActive(0), [q])
  // 활성 항목이 보이도록 스크롤
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const pick = (idx: number) => {
    onAdd(idx)
    setQ('')
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestions.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const s = suggestions[active]
      if (s) pick(s.idx)
    } else if (e.key === 'Escape') {
      setQ('')
    }
  }

  return (
    <>
      <div className="search-wrap">
        <input
          className="search-input"
          placeholder="교사 이름 검색"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
        />
        {suggestions.length > 0 && (
          <ul className="suggestions" ref={listRef}>
            {suggestions.map((s, i) => (
              <li
                key={s.idx}
                className={i === active ? 'active' : undefined}
                onClick={() => pick(s.idx)}
                onMouseEnter={() => setActive(i)}
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
