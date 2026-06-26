import { useMemo, useState } from 'react'
import { searchSchools, type School } from '../api'
import {
  classCode,
  lunchGroups,
  searchTeachers,
  subjectName,
  teacherDisplayName,
} from '../lib/helpers'
import { busyTeachers } from '../lib/schedule'
import { DAY_NAMES, type TeacherSchedule } from '../lib/types'
import { contentColorFor } from '../lib/palette'
import { MAX_FONT_LEVEL, MIN_FONT_LEVEL, type Group } from '../state'
import { Spinner } from './Icons'

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <span className="spacer" />
          <button className="modal-x" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function NameBadge({ name, bg, me = false }: { name: string; bg: string; me?: boolean }) {
  return (
    <span
      className="badge"
      style={{
        background: bg,
        color: contentColorFor(bg),
        padding: '3px 7px',
        fontSize: me ? 15 : 13,
        fontWeight: me ? 800 : 600,
      }}
    >
      {name}
    </span>
  )
}

// ── 설정 ──────────────────────────────────────────────────────────────────────

interface SettingsProps {
  showName: boolean
  showClass: boolean
  showSubject: boolean
  schoolCode: string
  fontLevel: number
  lunchEnabled: boolean
  onSetShowName: (v: boolean) => void
  onSetShowClass: (v: boolean) => void
  onSetShowSubject: (v: boolean) => void
  onSetSchoolCode: (code: string) => void
  onChangeFont: (delta: number) => void
  onSetLunch: (v: boolean) => void
  // 본인 교사를 id로 지정(검색해서 선택). 닉네임 문자열은 이 id에서 유도.
  teachers: Array<unknown>
  teacherCount: number
  myTeacherIdx: number | null
  onSetMyTeacher: (idx: number | null) => void
  onClose: () => void
}

export function SettingsModal(p: SettingsProps) {
  const [code, setCode] = useState(p.schoolCode)
  const [nameQuery, setNameQuery] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const close = () => {
    if (code.trim() && code.trim() !== p.schoolCode) p.onSetSchoolCode(code.trim())
    p.onClose()
  }

  const mySuggestions = useMemo(
    () => searchTeachers(p.teachers, p.teacherCount, nameQuery, [], 8),
    [p.teachers, p.teacherCount, nameQuery],
  )
  return (
    <>
    <Modal title="설정" onClose={close}>
      <div className="section">
        <div className="section-title">표시 형식</div>
        <div className="filter-chips">
          <button className={`filter-chip${p.showName ? ' on' : ''}`} onClick={() => p.onSetShowName(!p.showName)}>
            교사명
          </button>
          <button className={`filter-chip${p.showClass ? ' on' : ''}`} onClick={() => p.onSetShowClass(!p.showClass)}>
            학급
          </button>
          <button
            className={`filter-chip${p.showSubject ? ' on' : ''}`}
            onClick={() => p.onSetShowSubject(!p.showSubject)}
          >
            과목
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-title">학교 코드</div>
        <div className="code-row">
          <input
            className="text-input"
            inputMode="numeric"
            placeholder="16213"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
          />
          <button className="filter-chip nowrap" onClick={() => setShowSearch(true)}>
            학교 이름으로 검색
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-title">글씨 크기</div>
        <div className="stepper">
          <button onClick={() => p.onChangeFont(-1)} disabled={p.fontLevel <= MIN_FONT_LEVEL}>
            −
          </button>
          <span className="val">{p.fontLevel}</span>
          <button onClick={() => p.onChangeFont(1)} disabled={p.fontLevel >= MAX_FONT_LEVEL}>
            +
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-title">점심시간</div>
        <label className="toggle-row">
          점심시간 행 표시
          <input type="checkbox" checked={p.lunchEnabled} onChange={(e) => p.onSetLunch(e.target.checked)} />
        </label>
      </div>

      <div className="section">
        <div className="section-title">사용자 설정 (선택)</div>
        {p.myTeacherIdx != null ? (
          <div className="chips" style={{ padding: 0 }}>
            <span className="chip" style={{ background: '#555', color: '#fff' }}>
              {teacherDisplayName(p.teachers, p.myTeacherIdx)}
              <span className="x" onClick={() => p.onSetMyTeacher(null)}>
                ✕
              </span>
            </span>
          </div>
        ) : (
          <>
            <input
              className="text-input"
              placeholder="내 교사 이름 검색"
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
            />
            {mySuggestions.length > 0 && (
              <ul className="suggestions inline">
                {mySuggestions.map((s) => (
                  <li
                    key={s.idx}
                    onClick={() => {
                      p.onSetMyTeacher(s.idx)
                      setNameQuery('')
                    }}
                  >
                    {s.displayName}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <div className="hint">정한 이름은 시간표에서 굵게·크게 표시되어 본인 수업을 구별할 수 있어요.</div>
      </div>

      <button className="btn-primary" onClick={close}>
        완료
      </button>
    </Modal>
    {showSearch && (
      <SchoolSearchModal
        onPick={(picked) => {
          setCode(picked)
          setShowSearch(false)
        }}
        onClose={() => setShowSearch(false)}
      />
    )}
    </>
  )
}

// ── 학교 검색 ──────────────────────────────────────────────────────────────────

interface SchoolSearchProps {
  onPick: (code: string, name: string) => void
  onClose: () => void
}

export function SchoolSearchModal({ onPick, onClose }: SchoolSearchProps) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<School[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const run = async () => {
    const term = q.trim()
    if (!term) return
    setLoading(true)
    setErr('')
    try {
      setResults(await searchSchools(term))
    } catch {
      setErr('검색에 실패했습니다. 잠시 후 다시 시도해 주세요.')
      setResults(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="학교 검색" onClose={onClose}>
      <div className="code-row">
        <input
          className="text-input"
          placeholder="학교 이름 (예: 용산고)"
          value={q}
          autoFocus
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') run()
          }}
        />
        <button className="filter-chip nowrap" onClick={run}>
          검색
        </button>
      </div>

      {loading && (
        <div className="status">
          <Spinner />
        </div>
      )}
      {err && <div className="empty-note" style={{ marginTop: 12 }}>{err}</div>}
      {!loading && results && results.length === 0 && (
        <div className="empty-note" style={{ marginTop: 12 }}>검색 결과가 없습니다.</div>
      )}
      {results && results.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {results.map((s) => (
            <div
              className="edit-row school-row"
              key={`${s.code}-${s.name}`}
              onClick={() => onPick(s.code, s.name)}
            >
              <span className="name">{s.name}</span>
              {s.region && <span className="empty-note">{s.region}</span>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

// ── 그룹 편집 ──────────────────────────────────────────────────────────────────

interface GroupEditProps {
  groups: Group[]
  onMove: (name: string, up: boolean) => void
  onDelete: (name: string) => void
  onClose: () => void
}

export function GroupEditModal({ groups, onMove, onDelete, onClose }: GroupEditProps) {
  return (
    <Modal title="그룹 편집" onClose={onClose}>
      {groups.length === 0 && <div className="empty-note">저장된 그룹이 없습니다.</div>}
      {groups.map((g, i) => (
        <div className="edit-row" key={g.name}>
          <span className="name">{g.name}</span>
          <button onClick={() => onMove(g.name, true)} disabled={i === 0}>
            ▲
          </button>
          <button onClick={() => onMove(g.name, false)} disabled={i === groups.length - 1}>
            ▼
          </button>
          <button
            className="del"
            onClick={() => {
              if (confirm(`'${g.name}' 그룹을 삭제할까요?`)) onDelete(g.name)
            }}
          >
            삭제
          </button>
        </div>
      ))}
    </Modal>
  )
}

// ── 점심시간 상세 ──────────────────────────────────────────────────────────────

interface LunchProps {
  day: number
  schedule: TeacherSchedule
  selected: number[]
  teachers: Array<unknown>
  colorOf: (idx: number) => string
  myTeacherIdx: number | null
  onClose: () => void
}

export function LunchModal({ day, schedule, selected, teachers, colorOf, myTeacherIdx, onClose }: LunchProps) {
  const { period4, lunch } = lunchGroups(schedule, selected, day)
  const section = (label: string, indices: number[]) => (
    <div className="section">
      <div className="section-title">{label}</div>
      {indices.length === 0 ? (
        <span className="empty-note">없음</span>
      ) : (
        <div className="lunch-list">
          {indices.map((idx) => (
            <NameBadge
              key={idx}
              name={teacherDisplayName(teachers, idx)}
              bg={colorOf(idx)}
              me={idx === myTeacherIdx}
            />
          ))}
        </div>
      )}
    </div>
  )
  return (
    <Modal title={`${DAY_NAMES[day - 1]} 점심`} onClose={onClose}>
      {section('4교시', period4)}
      {section('점심시간', lunch)}
    </Modal>
  )
}

// ── 셀 상세 ────────────────────────────────────────────────────────────────────

interface CellDetailProps {
  day: number
  period: number
  schedule: TeacherSchedule
  selected: number[]
  teachers: Array<unknown>
  subjects: Array<unknown>
  colorOf: (idx: number) => string
  myTeacherIdx: number | null
  onClose: () => void
}

export function CellDetailModal({
  day,
  period,
  schedule,
  selected,
  teachers,
  subjects,
  colorOf,
  myTeacherIdx,
  onClose,
}: CellDetailProps) {
  const busy = busyTeachers(schedule, selected, day, period)
  return (
    <Modal title={`${DAY_NAMES[day - 1]}요일 ${period}교시`} onClose={onClose}>
      {busy.length === 0 ? (
        <span className="empty-note">수업이 없습니다.</span>
      ) : (
        <div className="lunch-list">
          {busy.map((idx) => {
            const info = schedule.get(idx)!.get(day)!.get(period)!
            const text = `${teacherDisplayName(teachers, idx)} ${classCode(info.grade, info.classNum)} ${subjectName(subjects, info.subjectIdx)}`.trim()
            return <NameBadge key={idx} name={text} bg={colorOf(idx)} me={idx === myTeacherIdx} />
          })}
        </div>
      )}
    </Modal>
  )
}
