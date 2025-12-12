export function getMenuDateLabel(dateInput?: string | null) {
  if (!dateInput) return null
  const safeDate = new Date(`${dateInput}T12:00:00`)
  if (Number.isNaN(safeDate.getTime())) return null
  return safeDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}
