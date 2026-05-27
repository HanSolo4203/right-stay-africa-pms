export function getUserDisplayName(user: {
  fullName: string | null
  email: string | null
} | null): string {
  if (!user) return "there"
  if (user.fullName) {
    const first = user.fullName.split(/\s+/)[0]
    if (first) return first
  }
  if (user.email) {
    const local = user.email.split("@")[0]?.replace(/[._-]+/g, " ").trim()
    if (local) return local.charAt(0).toUpperCase() + local.slice(1)
  }
  return "there"
}

export function getTimeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}
