export function getCurrentWeekStart(): Date {
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - now.getDay() + 1) // Monday
  monday.setHours(0, 0, 0, 0)
  return monday
}

/** Get the current date in YYYY-MM-DD format */
export function getCurrentDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Optional: if you want to delay any archiving until Tue 12:00 */
export function isBeforeTuesdayNoon(): boolean {
  const now = new Date()
  const tuesdayNoon = new Date(now)
  // set to Tuesday of this week, 12:00
  const day = now.getDay() // 0=Sun,1=Mon...
  const deltaToTue = 2 - day // days to Tuesday
  tuesdayNoon.setDate(now.getDate() + deltaToTue)
  tuesdayNoon.setHours(12, 0, 0, 0)
  return now < tuesdayNoon
}

export function checkVotingStatus(): boolean {
  const now = new Date()
  const dayOfWeek = now.getDay()
  const hours = now.getHours()
  
  // Voting open: Monday (1) all day, Tuesday (2) until noon
  return dayOfWeek === 1 || (dayOfWeek === 2 && hours < 12)
}
