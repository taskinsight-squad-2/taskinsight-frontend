import type { Task as ApiTask } from '@/types/task'
import type { Priority, Status } from '@/types/dashboard'

export function mapStatus(s: ApiTask['status']): Status {
  if (s === 'IN_PROGRESS') return 'InProgress'
  if (s === 'DONE')        return 'Done'
  return 'Pending'
}

export function mapPriority(p: ApiTask['priority']): Priority {
  if (p === 'HIGH')   return 'High'
  if (p === 'MEDIUM') return 'Medium'
  return 'Low'
}

export function today() {
  return new Date().toISOString().slice(0, 10)
}

export function fmt(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function daysBetween(a: string | null, b: string | null) {
  if (!a || !b) return null
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.max(0, Math.round(ms / 86_400_000))
}

export function slaInfo(
  originalDeadline: string | null,
  finished: string | null,
): { days: number; onTime: boolean } | null {
  if (!originalDeadline || !finished) return null
  const ms = new Date(finished).getTime() - new Date(originalDeadline).getTime()
  const days = Math.round(Math.abs(ms) / 86_400_000)
  return { days, onTime: ms <= 0 }
}
