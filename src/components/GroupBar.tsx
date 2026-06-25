import type { Group } from '../state'

interface Props {
  groups: Group[]
  onLoad: (name: string) => void
  onEdit: () => void
}

export function GroupBar({ groups, onLoad, onEdit }: Props) {
  return (
    <div className="groupbar">
      <span className="label">그룹:</span>
      {groups.length === 0 ? (
        <span className="label">저장된 그룹 없음</span>
      ) : (
        groups.map((g) => (
          <button key={g.name} className="group-chip" onClick={() => onLoad(g.name)}>
            {g.name}
          </button>
        ))
      )}
      {groups.length > 0 && (
        <button className="pill-btn" onClick={onEdit}>
          편집
        </button>
      )}
    </div>
  )
}
