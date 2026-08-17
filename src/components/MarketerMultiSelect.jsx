export default function MarketerMultiSelect({ marketers, selectedIds, onChange }) {
  const toggle = (id) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter((x) => x !== id))
    else onChange([...selectedIds, id])
  }

  return (
    <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-line p-3">
      {marketers.map((m) => (
        <label key={m.id} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line text-brand focus:ring-brand"
            checked={selectedIds.includes(m.id)}
            onChange={() => toggle(m.id)}
          />
          {m.name}
        </label>
      ))}
      {marketers.length === 0 && <p className="text-sm text-ink-faint">No marketers yet.</p>}
    </div>
  )
}