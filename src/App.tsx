import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchTimetable } from './api'
import { computeWeekDates, formatPeriodLabel } from './lib/helpers'
import { paletteColor } from './lib/palette'
import { build } from './lib/schedule'
import type { TeacherSchedule, TimetableData } from './lib/types'
import {
  buildShareUrl,
  clampFont,
  DEFAULT_FONT_LEVEL,
  loadInitialState,
  saveState,
  shouldPromptSchool,
  syncUrlToSchool,
  type AppState,
} from './state'
import { GearIcon, LinkIcon, Spinner } from './components/Icons'
import { GroupBar } from './components/GroupBar'
import { TeacherSearch } from './components/TeacherSearch'
import { TimetableGrid } from './components/TimetableGrid'
import { WeekBar } from './components/WeekBar'
import {
  CellDetailModal,
  GroupEditModal,
  LunchModal,
  SchoolSearchModal,
  SettingsModal,
} from './components/Modals'

type Modal =
  | null
  | { type: 'settings' }
  | { type: 'groupEdit' }
  | { type: 'lunch'; day: number }
  | { type: 'cell'; day: number; period: number }
  | { type: 'schoolSearch' }

export default function App() {
  // ⚠️ loadInitialState가 localStorage에 쓰기 전에 "빈 상태" 여부를 먼저 캡처
  const [promptSchool] = useState(shouldPromptSchool)
  const [state, setState] = useState<AppState>(loadInitialState)
  useEffect(() => saveState(state), [state])

  const [data, setData] = useState<TimetableData | null>(null)
  const [schedule, setSchedule] = useState<TeacherSchedule>(new Map())
  const [selectedR, setSelectedR] = useState('')
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [errMsg, setErrMsg] = useState('')
  const [modal, setModal] = useState<Modal>(promptSchool ? { type: 'schoolSearch' } : null)
  const [toast, setToast] = useState('')

  const load = useCallback(async (r: string, code: string) => {
    setStatus('loading')
    try {
      const d = await fetchTimetable(code, r)
      setData(d)
      setSchedule(build(d))
      setSelectedR(r || d.todayR)
      setStatus('ok')
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : '시간표를 불러오지 못했습니다.')
      setStatus('error')
    }
  }, [])

  // 최초 로드 (마운트 시 1회)
  useEffect(() => {
    load('', state.schoolCode)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const colorOf = useCallback(
    (idx: number) => paletteColor(state.selected.indexOf(idx)),
    [state.selected],
  )

  const weekDates = useMemo(() => (data ? computeWeekDates(data.startDate) : []), [data])
  const periodLabels = useMemo(
    () => (data ? Array.from({ length: 7 }, (_, i) => formatPeriodLabel(i + 1, data.periodTimes[i])) : []),
    [data],
  )

  // ── 핸들러 ───────────────────────────────────────────────────────────────
  const addTeacher = (idx: number) =>
    setState((s) => (s.selected.includes(idx) ? s : { ...s, selected: [...s.selected, idx] }))
  const removeTeacher = (idx: number) =>
    setState((s) => ({ ...s, selected: s.selected.filter((x) => x !== idx) }))

  const addGroup = () => {
    if (state.selected.length === 0) return
    const name = prompt('그룹 이름을 입력하세요')?.trim()
    if (!name) return
    setState((s) => {
      const groups = s.groups.filter((g) => g.name !== name)
      groups.push({ name, indices: [...s.selected] })
      return { ...s, groups }
    })
    setToast(`'${name}' 그룹 저장됨`)
  }
  const loadGroup = (name: string) =>
    setState((s) => {
      const g = s.groups.find((x) => x.name === name)
      return g ? { ...s, selected: [...g.indices] } : s
    })
  const moveGroup = (name: string, up: boolean) =>
    setState((s) => {
      const groups = [...s.groups]
      const i = groups.findIndex((g) => g.name === name)
      const j = up ? i - 1 : i + 1
      if (i < 0 || j < 0 || j >= groups.length) return s
      ;[groups[i], groups[j]] = [groups[j], groups[i]]
      return { ...s, groups }
    })
  const deleteGroup = (name: string) =>
    setState((s) => ({ ...s, groups: s.groups.filter((g) => g.name !== name) }))

  const setSchoolCode = (code: string) => {
    setState((s) => ({ ...s, schoolCode: code }))
    syncUrlToSchool(code)
    load('', code)
  }
  const changeFont = (delta: number) =>
    setState((s) => ({ ...s, fontLevel: clampFont(s.fontLevel + delta) }))
  const selectWeek = (r: string) => {
    if (r === selectedR) return
    load(r, state.schoolCode)
  }
  const share = async () => {
    const url = buildShareUrl(state)
    try {
      await navigator.clipboard.writeText(url)
      setToast('공유 링크가 복사되었습니다')
    } catch {
      setToast(url)
    }
  }

  const scale = state.fontLevel / DEFAULT_FONT_LEVEL

  return (
    <div style={{ '--scale': scale } as React.CSSProperties}>
      <div className="topbar">
        <h1>공강 찾기</h1>
        <span className="spacer" />
        <button className="icon-btn" onClick={share} title="공유">
          <LinkIcon />
        </button>
        <button className="icon-btn" onClick={() => setModal({ type: 'settings' })} title="설정">
          <GearIcon />
        </button>
      </div>

      {data && (
        <TeacherSearch
          teachers={data.teachers}
          teacherCount={data.teacherCount}
          selected={state.selected}
          colorOf={colorOf}
          onAdd={addTeacher}
          onRemove={removeTeacher}
          onAddGroup={addGroup}
        />
      )}

      <GroupBar groups={state.groups} onLoad={loadGroup} onEdit={() => setModal({ type: 'groupEdit' })} />

      {data && (
        <WeekBar
          weeks={data.weeks}
          selectedR={selectedR}
          todayR={data.todayR}
          onSelect={selectWeek}
        />
      )}

      {status === 'loading' && (
        <div className="status">
          <Spinner />
        </div>
      )}
      {status === 'error' && <div className="status">{errMsg}</div>}
      {status === 'ok' && data && (
        <TimetableGrid
          schedule={schedule}
          selected={state.selected}
          teachers={data.teachers}
          subjects={data.subjects}
          weekDates={weekDates}
          periodLabels={periodLabels}
          colorOf={colorOf}
          showName={state.showName}
          showClass={state.showClass}
          showSubject={state.showSubject}
          showLunchRow={state.lunchEnabled}
          onLunchClick={(day) => setModal({ type: 'lunch', day })}
          onCellClick={(day, period) => setModal({ type: 'cell', day, period })}
        />
      )}

      {modal?.type === 'settings' && (
        <SettingsModal
          showName={state.showName}
          showClass={state.showClass}
          showSubject={state.showSubject}
          schoolCode={state.schoolCode}
          fontLevel={state.fontLevel}
          lunchEnabled={state.lunchEnabled}
          onSetShowName={(v) => setState((s) => ({ ...s, showName: v }))}
          onSetShowClass={(v) => setState((s) => ({ ...s, showClass: v }))}
          onSetShowSubject={(v) => setState((s) => ({ ...s, showSubject: v }))}
          onSetSchoolCode={setSchoolCode}
          onChangeFont={changeFont}
          onSetLunch={(v) => setState((s) => ({ ...s, lunchEnabled: v }))}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'schoolSearch' && (
        <SchoolSearchModal
          onPick={(code) => {
            setSchoolCode(code)
            setModal(null)
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'groupEdit' && (
        <GroupEditModal
          groups={state.groups}
          onMove={moveGroup}
          onDelete={deleteGroup}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'lunch' && data && (
        <LunchModal
          day={modal.day}
          schedule={schedule}
          selected={state.selected}
          teachers={data.teachers}
          colorOf={colorOf}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'cell' && data && (
        <CellDetailModal
          day={modal.day}
          period={modal.period}
          schedule={schedule}
          selected={state.selected}
          teachers={data.teachers}
          subjects={data.subjects}
          colorOf={colorOf}
          onClose={() => setModal(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
