'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { adminService, ApiError } from '@/services/admin.service'
import { useA11yPrefs } from '@/hooks/useA11yPrefs'
import { translations, type Locale } from '@/lib/i18n'
import type { Task } from '@/types/task'
import type { User } from '@/types/user'

// ── helpers ──────────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10) }
function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}
function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function uid(u: User): string {
  return u.id ?? (u as unknown as Record<string, string>)._id ?? ''
}


// ── tipos ─────────────────────────────────────────────────────────────────────
type StatusFilter   = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED' | 'OVERDUE'
type PriorityFilter = 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'

// ── Tooltip ───────────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label, dark }: {
  active?: boolean
  payload?: { name: string; value: number; color?: string; stroke?: string }[]
  label?: string
  dark: boolean
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      backgroundColor: dark ? '#0D1117' : '#fff',
      border: `1px solid ${dark ? '#ffffff15' : '#e2e8f0'}`,
      borderRadius: 12, padding: '8px 12px', fontSize: 12,
    }}>
      {label && <p style={{ color: dark ? '#ffffff80' : '#64748b', marginBottom: 4, fontSize: 11, fontWeight: 600 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.stroke ?? p.color ?? '#7c3aed', fontWeight: 600 }}>
          {p.name}: <span style={{ fontVariantNumeric: 'tabular-nums' }}>{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function AdminPage() {
  const router = useRouter()
  const { prefs, set: setPrefs } = useA11yPrefs()
  const dark = prefs.darkMode


  const [tasks,        setTasks]        = useState<Task[]>([])
  const [users,        setUsers]        = useState<User[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [userName,     setUserName]     = useState('')
  const [userInitials, setUserInitials] = useState('U')

  // filtros da lista
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('ALL')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL')
  const [prodFilter,     setProdFilter]     = useState<'NONE'|'HIGH'|'MED'|'LOW'>('NONE')
  const [locale,         setLocale]         = useState<Locale>('pt')
  const t = translations[locale]
  const [taskSearch, setTaskSearch] = useState('')
  const [taskPage,   setTaskPage]   = useState(1)
  const TASK_PAGE_SIZE = 12

  // gráfico
  const [chartYear,  setChartYear]  = useState(new Date().getFullYear())
  const [chartMonth, setChartMonth] = useState(new Date().getMonth())
  const [chartWeek,  setChartWeek]  = useState(0)   // 0 = mês inteiro, 1-4 = semana

  const taskListRef = useRef<HTMLElement>(null)

  // guard admin
  useEffect(() => {
    try {
      const token  = localStorage.getItem('token')
      const stored = localStorage.getItem('user')
      if (!token || !stored) { router.replace('/login'); return }
      const u = JSON.parse(stored)
      setUserName(u.name?.split(' ')[0] ?? '')
      const parts = (u.name ?? '').trim().split(/\s+/).filter(Boolean)
      setUserInitials(
        parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : (parts[0]?.slice(0, 2) ?? 'U').toUpperCase()
      )
      if (u.role !== 'admin') { router.replace('/dashboard'); return }
    } catch { router.replace('/login') }
  }, [router])

  // dados
  const loadData = useCallback(async () => {
    const token = localStorage.getItem('token') ?? undefined
    if (!token) return
    setLoading(true); setError('')
    try {
      const [allTasks, allUsers] = await Promise.all([
        adminService.getAllTasks(token),
        adminService.getAllUsers(token),
      ])
      setTasks(Array.isArray(allTasks) ? allTasks : [])
      setUsers(Array.isArray(allUsers) ? allUsers : [])
    } catch (e: unknown) {
      const isAuthError =
        (e instanceof ApiError && (e.status === 401 || e.status === 403)) ||
        (e instanceof Error && /token|unauthorized|não autorizado|inválido/i.test(e.message))
      if (isAuthError) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        router.replace('/login')
        return
      }
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadData()
    const now = new Date()
    setChartYear(now.getFullYear())
    setChartMonth(now.getMonth())
  }, [loadData])

  // métricas globais
  const today = todayStr()
  const totalTasks = tasks.length
  const nDone      = tasks.filter(t => t.status === 'DONE').length
  const nCancelled = tasks.filter(t => t.status === 'CANCELLED').length
  // Em atraso = qualquer tarefa ativa (PENDING ou IN_PROGRESS) com prazo vencido
  // É categoria exclusiva: sai de Não iniciadas / Em andamento para não dupla-contar
  const nOverdue    = tasks.filter(t =>
    (t.status === 'PENDING' || t.status === 'IN_PROGRESS') && !!t.dueDate && t.dueDate < today
  ).length
  const nNotStarted = tasks.filter(t => t.status === 'PENDING' && !(t.dueDate && t.dueDate < today)).length
  const nProgress   = tasks.filter(t => t.status === 'IN_PROGRESS' && !(t.dueDate && t.dueDate < today)).length
  const doneRate    = totalTasks > 0 ? Math.round(nDone / totalTasks * 100) : 0

  // mapa userId → User (suporta _id e id)
  const userMap = useMemo(() => {
    const m: Record<string, User> = {}
    users.forEach(u => {
      const id = uid(u)
      if (id) m[id] = u
    })
    return m
  }, [users])

  // stats por usuário (ordenado: mais atrasados primeiro)
  const userStats = useMemo(() => {
    return users.map(u => {
      const id      = uid(u)
      const uAll    = tasks.filter(t => t.userId === id)
      const uOver   = uAll.filter(t => t.status === 'IN_PROGRESS' && !!t.dueDate && t.dueDate < today).length
      const uPend   = uAll.filter(t => t.status === 'PENDING').length
      const uProg   = uAll.filter(t => t.status === 'IN_PROGRESS').length
      const uDone   = uAll.filter(t => t.status === 'DONE').length
      const uCanc   = uAll.filter(t => t.status === 'CANCELLED').length
      const uHigh   = uAll.filter(t => t.priority === 'HIGH').length
      const uMedium = uAll.filter(t => t.priority === 'MEDIUM').length
      const uLow    = uAll.filter(t => t.priority === 'LOW').length
      // produtividade e tempo médio de entrega
      const uProductivity = uAll.length > 0 ? Math.round((uDone / uAll.length) * 100) : 0
      const withTimes = uAll.filter(t => t.status === 'DONE' && !!t.createdAt && !!(t.completedAt ?? t.updatedAt))
      const uAvgDays  = withTimes.length > 0
        ? Math.round(withTimes.reduce((sum, t) => {
            const end   = (t.completedAt ?? t.updatedAt)!
            return sum + Math.max(0, (new Date(end).getTime() - new Date(t.createdAt!).getTime()) / 86400000)
          }, 0) / withTimes.length * 10) / 10
        : null
      return { user: u, id, total: uAll.length, overdue: uOver, pending: uPend, inProgress: uProg, done: uDone, cancelled: uCanc, high: uHigh, medium: uMedium, low: uLow, productivity: uProductivity, avgDays: uAvgDays }
    })
      .filter(s => s.total > 0)
      .sort((a, b) => (b.done + b.inProgress + b.overdue) - (a.done + a.inProgress + a.overdue) || b.total - a.total)
  }, [users, tasks, today])

  // tempo médio de entrega global (todas as tarefas DONE)
  const overallAvgDays = useMemo(() => {
    const done = tasks.filter(t => t.status === 'DONE' && !!t.createdAt && !!(t.completedAt ?? t.updatedAt))
    if (!done.length) return null
    const sum = done.reduce((acc, t) => {
      const end = (t.completedAt ?? t.updatedAt)!
      return acc + Math.max(0, (new Date(end).getTime() - new Date(t.createdAt!).getTime()) / 86400000)
    }, 0)
    return Math.round(sum / done.length * 10) / 10
  }, [tasks])

  // gráfico: dados de sombra (planejadas × concluidas × em andamento × em atraso)
  type ShadowPoint = { label: string; planejadas: number; concluidas: number; emAndamento: number; emAtraso: number }

  const { chartPoints, chartLabel, weeksInMonth } = useMemo<{
    chartPoints: ShadowPoint[]
    chartLabel: string
    weeksInMonth: number
  }>(() => {
    if (chartMonth < 0 || chartYear <= 0) return { chartPoints: [], chartLabel: '', weeksInMonth: 4 }

    const daysInMonth = new Date(chartYear, chartMonth + 1, 0).getDate()
    const wCount      = Math.ceil(daysInMonth / 7)

    const dayPoint = (dayNum: number): ShadowPoint => {
      const dayStr = isoDay(new Date(chartYear, chartMonth, dayNum))
      return {
        label:       String(dayNum),
        planejadas:  tasks.filter(t => t.dueDate?.slice(0, 10) === dayStr).length,
        concluidas:  tasks.filter(t => t.status === 'DONE' && (t.completedAt ?? t.updatedAt)?.slice(0, 10) === dayStr).length,
        emAndamento: tasks.filter(t => t.status === 'IN_PROGRESS' && t.startedAt?.slice(0, 10) === dayStr).length,
        emAtraso:    tasks.filter(t => t.status === 'IN_PROGRESS' && !!t.dueDate && t.dueDate < dayStr).length,
      }
    }

    const weekPoint = (w: number): ShadowPoint => {
      const start    = (w - 1) * 7 + 1
      const end      = Math.min(w * 7, daysInMonth)
      const startStr = isoDay(new Date(chartYear, chartMonth, start))
      const endStr   = isoDay(new Date(chartYear, chartMonth, end))
      const inRange  = (iso: string | null | undefined) => !!iso && iso >= startStr && iso <= endStr
      return {
        label:       t.weekAbbr(w),
        planejadas:  tasks.filter(t => inRange(t.dueDate)).length,
        concluidas:  tasks.filter(t => t.status === 'DONE' && inRange(t.completedAt ?? t.updatedAt)).length,
        emAndamento: tasks.filter(t => t.status === 'IN_PROGRESS' && inRange(t.startedAt)).length,
        emAtraso:    tasks.filter(t => t.status === 'IN_PROGRESS' && !!t.dueDate && inRange(t.dueDate)).length,
      }
    }

    if (chartWeek >= 1 && chartWeek <= wCount) {
      const start  = (chartWeek - 1) * 7 + 1
      const end    = Math.min(chartWeek * 7, daysInMonth)
      return {
        chartPoints:  Array.from({ length: end - start + 1 }, (_, i) => dayPoint(start + i)),
        chartLabel:   t.weekLabelFn(chartWeek, t.months[chartMonth], chartYear),
        weeksInMonth: wCount,
      }
    }

    return {
      chartPoints:  Array.from({ length: wCount }, (_, i) => weekPoint(i + 1)),
      chartLabel:   `${t.months[chartMonth]} ${chartYear}`,
      weeksInMonth: wCount,
    }
  }, [tasks, chartYear, chartMonth, chartWeek])

  // nome curto: "Gilmar Silva" → "Gilmar S."
  const shortName = (name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0]
    return `${parts[0]} ${parts[parts.length - 1][0]}.`
  }

  // dados para gráfico de carga por usuário (top 12 por atividade)
  // ordenado por: concluídas + em andamento + em atraso DESC
  const userChartData = useMemo(() =>
    [...userStats]
      .sort((a, b) => (b.done + b.inProgress + b.overdue) - (a.done + a.inProgress + a.overdue) || b.total - a.total)
      .slice(0, 12)
      .map(s => ({
        userId:         uid(s.user),
        name:           shortName(s.user.name),
        fullName:       s.user.name,
        'Não iniciada': s.pending,
        'Em andamento': Math.max(0, s.inProgress - s.overdue),
        'Em atraso':    s.overdue,
        'Concluídas':   s.done,
        'Canceladas':   s.cancelled,
        total:          s.total,
        productivity:   s.productivity,
        avgDays:        s.avgDays,
      }))
      .reverse(),   // mais ativo no topo
  [userStats])

  // dados para gráfico prioridade × status
  const priorityChartData = useMemo(() => [
    {
      label: t.priorityHigh,
      'Não iniciada': tasks.filter(tk => tk.priority === 'HIGH' && tk.status === 'PENDING').length,
      'Em andamento': tasks.filter(tk => tk.priority === 'HIGH' && tk.status === 'IN_PROGRESS').length,
      'Concluídas':   tasks.filter(tk => tk.priority === 'HIGH' && tk.status === 'DONE').length,
      'Canceladas':   tasks.filter(tk => tk.priority === 'HIGH' && tk.status === 'CANCELLED').length,
      'Em atraso':    tasks.filter(tk => tk.priority === 'HIGH' && tk.status === 'IN_PROGRESS' && !!tk.dueDate && tk.dueDate < today).length,
    },
    {
      label: t.priorityMedium,
      'Não iniciada': tasks.filter(tk => tk.priority === 'MEDIUM' && tk.status === 'PENDING').length,
      'Em andamento': tasks.filter(tk => tk.priority === 'MEDIUM' && tk.status === 'IN_PROGRESS').length,
      'Concluídas':   tasks.filter(tk => tk.priority === 'MEDIUM' && tk.status === 'DONE').length,
      'Canceladas':   tasks.filter(tk => tk.priority === 'MEDIUM' && tk.status === 'CANCELLED').length,
      'Em atraso':    tasks.filter(tk => tk.priority === 'MEDIUM' && tk.status === 'IN_PROGRESS' && !!tk.dueDate && tk.dueDate < today).length,
    },
    {
      label: t.priorityLow,
      'Não iniciada': tasks.filter(tk => tk.priority === 'LOW' && tk.status === 'PENDING').length,
      'Em andamento': tasks.filter(tk => tk.priority === 'LOW' && tk.status === 'IN_PROGRESS').length,
      'Concluídas':   tasks.filter(tk => tk.priority === 'LOW' && tk.status === 'DONE').length,
      'Canceladas':   tasks.filter(tk => tk.priority === 'LOW' && tk.status === 'CANCELLED').length,
      'Em atraso':    tasks.filter(tk => tk.priority === 'LOW' && tk.status === 'IN_PROGRESS' && !!tk.dueDate && tk.dueDate < today).length,
    },
  ], [tasks, today, locale])

  // lista filtrada
  const filteredTasks = useMemo(() => {
    let list = tasks
    if (statusFilter === 'OVERDUE') {
      list = list.filter(t => (t.status === 'PENDING' || t.status === 'IN_PROGRESS') && !!t.dueDate && t.dueDate < today)
    } else if (statusFilter !== 'ALL') {
      list = list.filter(t => t.status === statusFilter)
    }
    if (priorityFilter !== 'ALL') list = list.filter(t => t.priority === priorityFilter)
    if (assigneeFilter !== 'ALL') list = list.filter(t => t.userId === assigneeFilter)
    if (taskSearch.trim()) {
      const q = taskSearch.toLowerCase()
      list = list.filter(t => t.title.toLowerCase().includes(q))
    }
    return list.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
  }, [tasks, statusFilter, priorityFilter, assigneeFilter, taskSearch, today])

  const taskTotalPages = Math.max(1, Math.ceil(filteredTasks.length / TASK_PAGE_SIZE))
  const safePage       = Math.min(taskPage, taskTotalPages)
  const paginatedTasks = filteredTasks.slice((safePage - 1) * TASK_PAGE_SIZE, safePage * TASK_PAGE_SIZE)
  useEffect(() => { setTaskPage(1) }, [statusFilter, priorityFilter, assigneeFilter, taskSearch])

  // tokens de tema
  const pageBg    = dark ? 'bg-[#080B14]'    : 'bg-[#F4F6FB]'
  const headerBg  = dark ? 'bg-[#080B14]/90' : 'bg-white/90'
  const headerBdr = dark ? 'border-white/5'  : 'border-slate-200'
  const text      = dark ? 'text-white'       : 'text-slate-900'
  const textMuted = dark ? 'text-white/70'    : 'text-slate-600'
  const textFaint = dark ? 'text-white/55'    : 'text-slate-500'
  const ctrlBg   = dark ? 'bg-white/5 border-white/10 text-white/65' : 'bg-white border-slate-200 text-slate-600'
  const cardBg   = dark ? 'bg-white/[0.03] border-white/8' : 'bg-white border-slate-200'
  const tableBdr = dark ? 'border-white/5'   : 'border-slate-100'
  const trHover  = dark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
  const inputCls = dark
    ? 'bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/60 transition'
    : 'bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-violet-400 transition'
  const selectCls = dark
    ? 'bg-[#0D1117] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white/80 outline-none focus:border-violet-500/60 cursor-pointer'
    : 'bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-violet-400 cursor-pointer'

  // configs dinâmicas (usam t para tradução)
  const statusCfg: Record<string, { label: string; dot: string; badge: string }> = {
    PENDING:     { label: t.sNotStarted,  dot: 'bg-slate-400',   badge: 'bg-slate-400/10 text-slate-400 border-slate-400/20'      },
    IN_PROGRESS: { label: t.sInProgress,  dot: 'bg-blue-400',    badge: 'bg-blue-400/10 text-blue-400 border-blue-400/20'         },
    DONE:        { label: t.sDonePlural,  dot: 'bg-emerald-400', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
    CANCELLED:   { label: t.sCancelled,  dot: 'bg-rose-400',    badge: 'bg-rose-400/10 text-rose-400 border-rose-400/20'         },
  }
  const priorityCfg: Record<string, { label: string; badge: string }> = {
    HIGH:   { label: t.priorityHigh,   badge: 'bg-red-400/10 text-red-400 border-red-400/20'             },
    MEDIUM: { label: t.priorityMedium, badge: 'bg-amber-400/10 text-amber-400 border-amber-400/20'       },
    LOW:    { label: t.priorityLow,    badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20' },
  }

  const summaryCards = [
    { label: t.usersLabel,       value: users.length, accent: 'text-violet-500', bg: 'bg-violet-500/10 border-violet-500/20',
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { label: t.totalTasks,       value: totalTasks,   accent: 'text-indigo-500', bg: 'bg-indigo-500/10 border-indigo-500/20',
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
    { label: t.notStartedPlural, value: nNotStarted,  accent: 'text-slate-400',  bg: 'bg-slate-400/10 border-slate-400/20',
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { label: t.sInProgress,      value: nProgress,    accent: 'text-blue-500',   bg: 'bg-blue-500/10 border-blue-500/20',
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
    { label: t.sDonePlural,      value: nDone,        accent: 'text-emerald-500',bg: 'bg-emerald-500/10 border-emerald-500/20',
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
    { label: t.sCancelled,       value: nCancelled,   accent: 'text-rose-500',   bg: 'bg-rose-500/10 border-rose-500/20',
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> },
    { label: t.sOverdue,         value: nOverdue,     accent: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/20',
      icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
  ]

  const statusTabs = [
    { key: 'ALL'         as StatusFilter, label: t.sAll,        count: tasks.length },
    { key: 'PENDING'     as StatusFilter, label: t.sNotStarted, count: nNotStarted  },
    { key: 'IN_PROGRESS' as StatusFilter, label: t.sInProgress, count: nProgress    },
    { key: 'DONE'        as StatusFilter, label: t.sDonePlural, count: nDone        },
    { key: 'CANCELLED'   as StatusFilter, label: t.sCancelled,  count: nCancelled   },
    { key: 'OVERDUE'     as StatusFilter, label: t.sOverdue,    count: nOverdue     },
  ]

  return (
    <div className={`min-h-screen ${pageBg} transition-colors duration-300`}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className={`sticky top-0 z-30 border-b ${headerBdr} ${headerBg} backdrop-blur-xl transition-colors duration-300`}>

        {/* Linha 1: navegação + controles primários */}
        <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => router.push('/dashboard')}
              className={`flex items-center gap-1 text-xs font-semibold ${textFaint} hover:opacity-80 transition flex-shrink-0`}>
              <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              <span>Dashboard</span>
            </button>
            <span className={`${dark ? 'text-white/15' : 'text-slate-300'} select-none flex-shrink-0`}>|</span>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center flex-shrink-0">
                <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="min-w-0">
                <h1 className={`text-sm font-bold ${text} leading-tight truncate`}>{t.adminTitle}</h1>
                <p className="text-[10px] text-violet-500 mt-0.5 hidden sm:block">{t.adminDesc}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* sempre: dark mode */}
            <button onClick={() => setPrefs('darkMode', !dark)}
              aria-label={dark ? t.lightModeAria : t.darkModeAria}
              className={`h-8 w-8 flex items-center justify-center rounded-lg border ${ctrlBg} hover:opacity-80 transition text-sm`}>
              {dark ? '☀️' : '🌙'}
            </button>
            {/* desktop: PT / EN toggle */}
            <div className={`hidden sm:flex items-center h-8 rounded-lg border ${ctrlBg} overflow-hidden text-xs font-bold`}>
              {(['pt', 'en'] as Locale[]).map((l, i) => (
                <button key={l} onClick={() => setLocale(l)}
                  aria-label={l === 'pt' ? 'Português' : 'English'}
                  className={`h-full px-2.5 transition-all ${i > 0 ? `border-l ${dark ? 'border-white/10' : 'border-slate-200'}` : ''} ${
                    locale === l
                      ? (dark ? 'bg-white/15 text-white' : 'bg-slate-200 text-slate-800')
                      : (dark ? 'text-white/40 hover:text-white/70' : 'text-slate-400 hover:text-slate-600') + ' bg-transparent'
                  }`}>
                  {l === 'pt' ? 'PT' : 'EN'}
                </button>
              ))}
            </div>
            {/* sempre: atualizar */}
            <button onClick={loadData} aria-label={t.refreshAria}
              className={`h-8 w-8 flex items-center justify-center rounded-lg border ${ctrlBg} hover:opacity-80 transition`}>
              <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
            {/* sempre: avatar */}
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
              {userInitials}
            </div>
            {/* desktop: nome */}
            <div className="hidden sm:block">
              <p className={`text-xs font-semibold ${text}`}>{userName}</p>
              <p className="text-[10px] text-violet-400 font-bold tracking-wide">ADMIN</p>
            </div>
            {/* sempre: Sair */}
            <button
              onClick={() => { localStorage.removeItem('token'); localStorage.removeItem('user'); router.replace('/login') }}
              aria-label="Sair da conta"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition flex-shrink-0">
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span className="hidden sm:inline">{t.signOut}</span>
            </button>
          </div>
        </div>

        {/* Linha 2: controles secundários — visível apenas em mobile */}
        <div className="flex sm:hidden items-center gap-2 px-3 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {/* PT/EN toggle */}
          <div className={`flex items-center h-[30px] rounded-lg border ${ctrlBg} overflow-hidden text-xs font-bold flex-shrink-0`}>
            {(['pt', 'en'] as Locale[]).map((l, i) => (
              <button key={l} onClick={() => setLocale(l)}
                aria-label={l === 'pt' ? 'Português' : 'English'}
                className={`h-full px-3 transition-all ${i > 0 ? `border-l ${dark ? 'border-white/10' : 'border-slate-200'}` : ''} ${
                  locale === l
                    ? (dark ? 'bg-white/15 text-white' : 'bg-slate-200 text-slate-800')
                    : (dark ? 'text-white/40 hover:text-white/70' : 'text-slate-400 hover:text-slate-600') + ' bg-transparent'
                }`}>
                {l === 'pt' ? 'PT' : 'EN'}
              </button>
            ))}
          </div>
          {/* nome + role */}
          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
            <span className={`text-xs font-semibold ${text}`}>{userName}</span>
            <span className="text-[10px] text-violet-400 font-bold tracking-wide">ADMIN</span>
          </div>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main id="main-content" className="px-3 py-4 sm:px-6 sm:py-6 flex flex-col gap-4 sm:gap-5 max-w-[1440px] mx-auto w-full">

        {loading && (
          <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-28">
            <span aria-hidden className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin"/>
            <span className="text-sm text-violet-500">{t.loadingSystem}</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-28 gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p className="text-red-400 text-sm font-semibold">{error}</p>
            <button onClick={loadData} className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-violet-600 hover:bg-violet-500 transition">
              {t.tryAgain}
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Cards de resumo ──────────────────────────────────────────── */}
            <section aria-label="Resumo geral">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {summaryCards.map(c => (
                  <div key={c.label} className={`${cardBg} border rounded-xl px-3 py-3 flex items-center gap-2.5 transition-colors`}>
                    <div className={`w-7 h-7 rounded-lg ${c.bg} border flex items-center justify-center ${c.accent} flex-shrink-0`}>
                      {c.icon}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[9px] font-semibold ${textFaint} uppercase tracking-widest truncate`}>{c.label}</p>
                      <p className={`text-xl font-black ${text} leading-tight tabular-nums`}>{c.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className={`text-[10px] ${textFaint} mt-2`}>
                Total = Não iniciadas + Em andamento + Concluídas + Canceladas &mdash;{' '}
                <span className="text-orange-400 font-semibold">Em atraso</span> = tarefas ativas (não iniciadas ou em andamento) com prazo vencido — excluídas das demais categorias
              </p>
            </section>

            {/* ── Gráfico de evolução ───────────────────────────────────────── */}
            <section aria-label="Gráfico de evolução por período">
              <div className={`${cardBg} border rounded-2xl p-5`}>
                <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                  <div>
                    <h2 className={`text-sm font-bold ${text}`}>{t.evoTitle}</h2>
                    <p className={`text-[11px] ${textFaint} mt-0.5`}>{chartLabel || '—'}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Seletor de mês */}
                    <select value={chartMonth}
                      onChange={e => { setChartMonth(Number(e.target.value)); setChartWeek(0) }}
                      className={selectCls}
                      aria-label={t.monthSelectAria}>
                      {t.months.map((m, i) => (
                        <option key={i} value={i} style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>{m}</option>
                      ))}
                    </select>

                    {/* Seletor de semana */}
                    <div className={`flex ${dark ? 'bg-white/5 border-white/8' : 'bg-slate-100 border-slate-200'} border rounded-xl p-1 gap-1`}>
                      <button onClick={() => setChartWeek(0)} aria-pressed={chartWeek === 0}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                          chartWeek === 0 ? 'bg-violet-600 text-white shadow-sm' : dark ? 'text-white/55 hover:text-white/80' : 'text-slate-500 hover:text-slate-700'
                        }`}>{t.monthBtn}</button>
                      {Array.from({ length: weeksInMonth > 0 ? weeksInMonth : 4 }, (_, i) => i + 1).map(w => (
                        <button key={w} onClick={() => setChartWeek(w)} aria-pressed={chartWeek === w}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                            chartWeek === w ? 'bg-violet-600 text-white shadow-sm' : dark ? 'text-white/55 hover:text-white/80' : 'text-slate-500 hover:text-slate-700'
                          }`}>S{w}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* legenda */}
                <div className="flex gap-5 mb-3 flex-wrap">
                  {[
                    { color: '#10b981', label: t.sDonePlural,  dashed: false },
                    { color: '#3b82f6', label: t.sInProgress,  dashed: false },
                    { color: '#f97316', label: t.sOverdue,     dashed: false },
                    { color: '#7c3aed', label: t.sPlanned,     dashed: true  },
                  ].map(l => (
                    <span key={l.label} className="flex items-center gap-1.5">
                      <span className="inline-flex items-center w-6 h-3 flex-shrink-0">
                        <svg width="24" height="4">
                          <line x1="0" y1="2" x2="24" y2="2" stroke={l.color} strokeWidth="2.5"
                            strokeDasharray={l.dashed ? '5 3' : undefined}/>
                        </svg>
                      </span>
                      <span className={`text-[11px] ${textFaint}`}>{l.label}</span>
                    </span>
                  ))}
                </div>

                {chartMonth >= 0 && chartYear > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <AreaChart data={chartPoints} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10b981" stopOpacity={0.35}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.02}/>
                        </linearGradient>
                        <linearGradient id="gProg" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.28}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02}/>
                        </linearGradient>
                        <linearGradient id="gOver" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#f97316" stopOpacity={0.45}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0.02}/>
                        </linearGradient>
                        <linearGradient id="gPlan" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#7c3aed" stopOpacity={0.12}/>
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#ffffff08' : '#e2e8f0'} vertical={false}/>
                      <XAxis dataKey="label"
                        tick={{ fill: dark ? '#ffffff40' : '#94a3b8', fontSize: 10 }}
                        axisLine={false} tickLine={false}/>
                      <YAxis allowDecimals={false}
                        tick={{ fill: dark ? '#ffffff55' : '#64748b', fontSize: 10 }}
                        axisLine={false} tickLine={false}/>
                      <Tooltip content={<ChartTooltip dark={dark}/>}/>
                      {/* planejadas — fantasma tracejado */}
                      <Area type="monotone" dataKey="planejadas" name={t.sPlanned}
                        stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="5 4"
                        fill="url(#gPlan)" dot={false} activeDot={{ r: 4 }}/>
                      {/* em atraso — sombra laranja */}
                      <Area type="monotone" dataKey="emAtraso" name={t.sOverdue}
                        stroke="#f97316" strokeWidth={2}
                        fill="url(#gOver)" dot={false} activeDot={{ r: 4 }}/>
                      {/* em andamento */}
                      <Area type="monotone" dataKey="emAndamento" name={t.sInProgress}
                        stroke="#3b82f6" strokeWidth={2}
                        fill="url(#gProg)" dot={false} activeDot={{ r: 4 }}/>
                      {/* concluídas — linha mais grossa */}
                      <Area type="monotone" dataKey="concluidas" name={t.sDonePlural}
                        stroke="#10b981" strokeWidth={2.5}
                        fill="url(#gDone)" dot={false} activeDot={{ r: 4 }}/>
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={`flex items-center justify-center h-[240px] ${textFaint} text-sm`}>
                    {t.loadingChart}
                  </div>
                )}
              </div>
            </section>

            {/* ── Gráfico 2 + 3 ────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-5">

              {/* Carga por Responsável */}
              <section className="lg:col-span-3" aria-label="Carga por responsável">
                <div className={`${cardBg} border rounded-2xl p-5 flex flex-col gap-4`}>

                  {/* cabeçalho */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h2 className={`text-sm font-bold ${text}`}>{t.workloadTitle}</h2>
                      <p className={`text-[11px] ${textFaint} mt-0.5`}>
                        {t.topActivity(userChartData.length)}
                      </p>
                    </div>
                    {/* métricas globais */}
                    <div className="flex items-center gap-3">
                      <div className={`flex flex-col items-end px-3 py-2 rounded-xl border ${dark ? 'border-white/8 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}>
                        <span className={`text-[10px] font-semibold ${textFaint} uppercase tracking-widest`}>{t.productivityLbl}</span>
                        <span className={`text-lg font-black tabular-nums ${doneRate >= 70 ? 'text-emerald-400' : doneRate >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{doneRate}%</span>
                      </div>
                      <div className={`flex flex-col items-end px-3 py-2 rounded-xl border ${dark ? 'border-white/8 bg-white/[0.03]' : 'border-slate-100 bg-slate-50'}`}>
                        <span className={`text-[10px] font-semibold ${textFaint} uppercase tracking-widest`}>{t.avgDelivLbl}</span>
                        <span className={`text-lg font-black tabular-nums ${text}`}>
                          {overallAvgDays != null ? `${overallAvgDays}d` : '—'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* legenda */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {([
                      { c: '#64748b', l: t.sNotStarted },
                      { c: '#3b82f6', l: t.sInProgress },
                      { c: '#f97316', l: t.sOverdue    },
                      { c: '#10b981', l: t.sDonePlural },
                      { c: '#f43f5e', l: t.sCancelled  },
                    ] as { c: string; l: string }[]).map(({ c, l }) => (
                      <span key={l} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c }}/>
                        <span className={`text-[10px] font-medium ${textFaint}`}>{l}</span>
                      </span>
                    ))}
                  </div>

                  {/* gráfico de barras */}
                  {(() => {
                    const maxTotal = userChartData.length > 0 ? Math.max(...userChartData.map(d => d.total)) : 10
                    const xMax = Math.ceil(maxTotal / 5) * 5 || 10
                    const xTicks = Array.from({ length: Math.min(7, Math.ceil(xMax / 5) + 1) }, (_, i) => i * 5)
                    return (
                      <ResponsiveContainer width="100%" height={Math.max(200, userChartData.length * 34)}>
                        <BarChart layout="vertical" data={userChartData}
                          margin={{ top: 0, right: 8, left: 0, bottom: 0 }} barSize={13}>
                          <CartesianGrid strokeDasharray="2 4"
                            stroke={dark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'} horizontal={false}/>
                          <XAxis type="number" allowDecimals={false}
                            domain={[0, xMax]} ticks={xTicks}
                            tickFormatter={v => `${v}`}
                            tick={{ fill: dark ? 'rgba(255,255,255,0.3)' : '#94a3b8', fontSize: 10 }}
                            axisLine={false} tickLine={false}
                            label={{ value: 'tarefas', position: 'insideBottomRight', offset: -4, fontSize: 9, fill: dark ? 'rgba(255,255,255,0.2)' : '#cbd5e1' }}/>
                          <YAxis type="category" dataKey="name" width={80}
                            tick={{ fill: dark ? 'rgba(255,255,255,0.65)' : '#334155', fontSize: 11, fontWeight: 500 }}
                            axisLine={false} tickLine={false}/>
                          <Tooltip
                            cursor={{ fill: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            content={({ active, payload, label }: any) => {
                              if (!active || !payload?.length) return null
                              const entry = userChartData.find(d => d.name === label)
                              const total = payload.reduce((s: number, p: { value?: number }) => s + (p.value ?? 0), 0)
                              return (
                                <div style={{
                                  backgroundColor: dark ? '#111827' : '#fff',
                                  border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e2e8f0'}`,
                                  borderRadius: 10, padding: '10px 14px', fontSize: 12,
                                  boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 4px 16px rgba(0,0,0,0.1)',
                                  minWidth: 180,
                                }}>
                                  <p style={{ color: dark ? 'rgba(255,255,255,0.9)' : '#1e293b', fontWeight: 700, marginBottom: 8, fontSize: 13 }}>
                                    {entry?.fullName ?? label}
                                  </p>
                                  {payload.map((p: { name?: string; value?: number; fill?: string }, i: number) => p.value ? (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.fill, flexShrink: 0 }}/>
                                      <span style={{ color: dark ? 'rgba(255,255,255,0.55)' : '#64748b', flex: 1 }}>{p.name}</span>
                                      <span style={{ color: dark ? '#fff' : '#0f172a', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{p.value}</span>
                                    </div>
                                  ) : null)}
                                  <div style={{ borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#f1f5f9'}`, marginTop: 8, paddingTop: 8 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                      <span style={{ color: dark ? 'rgba(255,255,255,0.4)' : '#94a3b8', fontSize: 11 }}>{t.totalTasksLbl}</span>
                                      <span style={{ color: dark ? '#fff' : '#0f172a', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{total}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                      <span style={{ color: dark ? 'rgba(255,255,255,0.4)' : '#94a3b8', fontSize: 11 }}>{t.productivityLbl}</span>
                                      <span style={{ color: (entry?.productivity ?? 0) >= 70 ? '#10b981' : (entry?.productivity ?? 0) >= 40 ? '#f59e0b' : '#f43f5e', fontWeight: 700 }}>
                                        {entry?.productivity ?? 0}%
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                      <span style={{ color: dark ? 'rgba(255,255,255,0.4)' : '#94a3b8', fontSize: 11 }}>{t.avgTimeLbl}</span>
                                      <span style={{ color: dark ? 'rgba(255,255,255,0.8)' : '#475569', fontWeight: 700 }}>
                                        {entry?.avgDays != null ? `${entry.avgDays} ${t.daysUnit}` : '—'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              )
                            }}
                          />
                          <Bar dataKey="Não iniciada" name={t.sNotStarted} stackId="s" fill="#64748b" radius={0}/>
                          <Bar dataKey="Em andamento" name={t.sInProgress} stackId="s" fill="#3b82f6" radius={0}/>
                          <Bar dataKey="Em atraso"    name={t.sOverdue}    stackId="s" fill="#f97316" radius={0}/>
                          <Bar dataKey="Concluídas"   name={t.sDonePlural} stackId="s" fill="#10b981" radius={0}/>
                          <Bar dataKey="Canceladas"   name={t.sCancelled}  stackId="s" fill="#f43f5e" radius={[0,3,3,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    )
                  })()}

                  {/* produtividade individual — aparece ao selecionar um filtro */}
                  {(() => {
                    const PROD_FILTERS = [
                      { key: 'HIGH', label: '≥ 70%', color: '#10b981', test: (p: number) => p >= 70 },
                      { key: 'MED',  label: '40–69%', color: '#f59e0b', test: (p: number) => p >= 40 && p < 70 },
                      { key: 'LOW',  label: '< 40%',  color: '#f43f5e', test: (p: number) => p < 40 },
                    ] as const

                    const filteredUsers = prodFilter === 'NONE'
                      ? []
                      : [...userChartData].reverse().filter(u =>
                          PROD_FILTERS.find(f => f.key === prodFilter)!.test(u.productivity)
                        )

                    return (
                      <div className={`border-t ${dark ? 'border-white/6' : 'border-slate-100'} pt-4`}>
                        {/* cabeçalho + filtros */}
                        <div className="flex items-center gap-3 flex-wrap mb-3">
                          <p className={`text-[10px] font-semibold ${textFaint} uppercase tracking-widest shrink-0`}>
                            {t.productivityLbl}
                          </p>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setProdFilter('NONE')}
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                                prodFilter === 'NONE'
                                  ? `${dark ? 'bg-white/10 border-white/20 text-white/80' : 'bg-slate-100 border-slate-300 text-slate-600'}`
                                  : `${dark ? 'border-white/10 text-white/35 hover:text-white/60' : 'border-slate-200 text-slate-300 hover:text-slate-500'} bg-transparent`
                              }`}>
                              {t.pAll}
                            </button>
                            {PROD_FILTERS.map(f => {
                              const active = prodFilter === f.key
                              return (
                                <button key={f.key}
                                  onClick={() => setProdFilter(active ? 'NONE' : f.key)}
                                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                                    active
                                      ? 'text-white border-transparent'
                                      : `${dark ? 'border-white/10 text-white/40 hover:text-white/70' : 'border-slate-200 text-slate-400 hover:text-slate-600'} bg-transparent`
                                  }`}
                                  style={active ? { backgroundColor: f.color, borderColor: f.color } : {}}>
                                  {f.label}
                                </button>
                              )
                            })}
                          </div>
                          {prodFilter !== 'NONE' && (
                            <span className={`text-[10px] ${textFaint} ml-auto`}>
                              {filteredUsers.length} responsável{filteredUsers.length !== 1 ? 'is' : ''}
                            </span>
                          )}
                        </div>

                        {/* tabela — visível apenas com filtro ativo */}
                        {prodFilter !== 'NONE' && (
                          <>
                            <div className={`grid gap-x-3 text-[10px] font-semibold ${textFaint} uppercase tracking-widest mb-2 px-2`}
                              style={{ gridTemplateColumns: '1fr 52px 140px 72px' }}>
                              <span>{t.ownerLbl}</span>
                              <span className="text-right">{t.tasksTitle}</span>
                              <span>{t.deliveryLbl}</span>
                              <span className="text-right">{t.avgTimeSmLbl}</span>
                            </div>

                            {filteredUsers.length === 0 ? (
                              <p className={`text-xs ${textFaint} text-center py-4`}>{t.noOwnerRange}</p>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {filteredUsers.map(u => {
                                  const barColor = u.productivity >= 70 ? '#10b981' : u.productivity >= 40 ? '#f59e0b' : '#f43f5e'
                                  return (
                                    <div key={u.userId || u.fullName}
                                      className={`grid gap-x-3 items-center py-1.5 px-2 rounded-lg ${dark ? 'hover:bg-white/[0.03]' : 'hover:bg-slate-50'} transition`}
                                      style={{ gridTemplateColumns: '1fr 52px 140px 72px' }}>
                                      <span className={`text-xs font-medium ${text} truncate`} title={u.fullName}>{u.name}</span>
                                      <span className={`text-xs font-bold tabular-nums text-right ${textMuted}`}>{u.total}</span>
                                      <div className="flex items-center gap-2">
                                        <div className={`flex-1 h-1.5 rounded-full ${dark ? 'bg-white/8' : 'bg-slate-100'} overflow-hidden`}>
                                          <div className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${u.productivity}%`, backgroundColor: barColor }}/>
                                        </div>
                                        <span className="text-[11px] font-bold tabular-nums w-8 text-right" style={{ color: barColor }}>
                                          {u.productivity}%
                                        </span>
                                      </div>
                                      <span className={`text-[11px] font-semibold tabular-nums text-right ${u.avgDays != null ? textMuted : textFaint}`}>
                                        {u.avgDays != null ? `${u.avgDays}d` : '—'}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}

                            {/* rodapé */}
                            <div className={`grid gap-x-3 items-center mt-2 pt-2 border-t ${dark ? 'border-white/6' : 'border-slate-100'} px-2`}
                              style={{ gridTemplateColumns: '1fr 52px 140px 72px' }}>
                              <span className={`text-[11px] font-bold ${text}`}>{t.overallAvg}</span>
                              <span className={`text-xs font-bold tabular-nums text-right ${text}`}>{totalTasks}</span>
                              <div className="flex items-center gap-2">
                                <div className={`flex-1 h-1.5 rounded-full ${dark ? 'bg-white/8' : 'bg-slate-100'} overflow-hidden`}>
                                  <div className="h-full rounded-full transition-all duration-700"
                                    style={{ width: `${doneRate}%`, backgroundColor: doneRate >= 70 ? '#10b981' : doneRate >= 40 ? '#f59e0b' : '#f43f5e' }}/>
                                </div>
                                <span className="text-[11px] font-bold tabular-nums w-8 text-right"
                                  style={{ color: doneRate >= 70 ? '#10b981' : doneRate >= 40 ? '#f59e0b' : '#f43f5e' }}>
                                  {doneRate}%
                                </span>
                              </div>
                              <span className={`text-[11px] font-bold tabular-nums text-right ${text}`}>
                                {overallAvgDays != null ? `${overallAvgDays}d` : '—'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </section>

              {/* Prioridade × Status — também horizontal para consistência */}
              <section className="lg:col-span-2" aria-label="Prioridade por status">
                <div className={`${cardBg} border rounded-2xl p-5 h-full flex flex-col`}>
                  <div className="mb-5">
                    <h2 className={`text-sm font-bold ${text}`}>{t.priorityXStatus}</h2>
                    <p className={`text-[11px] ${textFaint} mt-0.5`}>{t.priorityDist}</p>
                  </div>

                  {/* mini stats por prioridade */}
                  <div className="grid grid-cols-3 gap-2 mb-5">
                    {priorityChartData.map(p => {
                      const ptotal = (p['Não iniciada'] as number) + (p['Em andamento'] as number) + (p['Concluídas'] as number) + (p['Canceladas'] as number)
                      const pDone  = p['Concluídas'] as number
                      const rate   = ptotal > 0 ? Math.round((pDone / ptotal) * 100) : 0
                      const accent = p.label === t.priorityHigh ? { text: 'text-red-400', bar: '#ef4444', bg: dark ? 'bg-red-500/10 border-red-500/15' : 'bg-red-50 border-red-100' }
                        : p.label === t.priorityMedium ? { text: 'text-amber-400', bar: '#f59e0b', bg: dark ? 'bg-amber-500/10 border-amber-500/15' : 'bg-amber-50 border-amber-100' }
                        : { text: 'text-emerald-400', bar: '#10b981', bg: dark ? 'bg-emerald-500/10 border-emerald-500/15' : 'bg-emerald-50 border-emerald-100' }
                      return (
                        <div key={p.label} className={`rounded-xl border ${accent.bg} px-3 py-2.5`}>
                          <p className={`text-[10px] font-bold ${accent.text} uppercase tracking-widest`}>{p.label}</p>
                          <p className={`text-lg font-black ${text} tabular-nums leading-tight mt-0.5`}>{ptotal}</p>
                          <div className={`h-1 rounded-full mt-2 ${dark ? 'bg-white/8' : 'bg-black/8'}`}>
                            <div className="h-full rounded-full transition-all duration-700"
                              style={{ width: `${rate}%`, backgroundColor: accent.bar }}/>
                          </div>
                          <p className={`text-[9px] mt-1 ${textFaint}`}>{rate}{t.pctDone}</p>
                        </div>
                      )
                    })}
                  </div>

                  {/* legenda */}
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    {([
                      { c: '#64748b', l: t.sNotStarted },
                      { c: '#3b82f6', l: t.sInProgress },
                      { c: '#f97316', l: t.sOverdue    },
                      { c: '#10b981', l: t.sDonePlural },
                      { c: '#f43f5e', l: t.sCancelled  },
                    ] as { c: string; l: string }[]).map(({ c, l }) => (
                      <span key={l} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c }}/>
                        <span className={`text-[10px] font-medium ${textFaint}`}>{l}</span>
                      </span>
                    ))}
                  </div>

                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart layout="vertical" data={priorityChartData}
                        margin={{ top: 0, right: 4, left: 0, bottom: 0 }} barSize={16}>
                        <CartesianGrid strokeDasharray="2 4"
                          stroke={dark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'} horizontal={false}/>
                        <XAxis type="number" allowDecimals={false}
                          tick={{ fill: dark ? 'rgba(255,255,255,0.3)' : '#94a3b8', fontSize: 10 }}
                          axisLine={false} tickLine={false}/>
                        <YAxis type="category" dataKey="label" width={46}
                          tick={{ fill: dark ? 'rgba(255,255,255,0.65)' : '#334155', fontSize: 11, fontWeight: 700 }}
                          axisLine={false} tickLine={false}/>
                        <Tooltip content={<ChartTooltip dark={dark}/>}
                          cursor={{ fill: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}/>
                        <Bar dataKey="Não iniciada" name={t.sNotStarted} stackId="p" fill="#64748b" radius={0}/>
                        <Bar dataKey="Em andamento" name={t.sInProgress} stackId="p" fill="#3b82f6" radius={0}/>
                        <Bar dataKey="Em atraso"    name={t.sOverdue}    stackId="p" fill="#f97316" radius={0}/>
                        <Bar dataKey="Concluídas"   name={t.sDonePlural} stackId="p" fill="#10b981" radius={0}/>
                        <Bar dataKey="Canceladas"   name={t.sCancelled}  stackId="p" fill="#f43f5e" radius={[0,3,3,0]}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </section>
            </div>

            {/* ── Lista de Tarefas ─────────────────────────────────────────── */}
            <section ref={taskListRef} aria-label="Lista de tarefas">
              <div className={`${cardBg} border rounded-2xl overflow-hidden`}>

                {/* toolbar */}
                <div className={`px-3 sm:px-5 pt-3 sm:pt-4 pb-3 border-b ${tableBdr}`}>

                  {/* título + busca + chip ativo */}
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div>
                        <h2 className={`text-sm font-bold ${text}`}>{t.tasksTitle}</h2>
                        <p className={`text-[10px] ${textFaint} mt-0.5`}>
                          {t.foundTasks(filteredTasks.length)}
                        </p>
                      </div>
                      {assigneeFilter !== 'ALL' && userMap[assigneeFilter] && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-violet-500/30 bg-violet-500/10">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
                            {userMap[assigneeFilter].name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[11px] text-violet-400 font-semibold">{userMap[assigneeFilter].name}</span>
                          <button onClick={() => setAssigneeFilter('ALL')} aria-label="Remover filtro de responsável"
                            className="text-violet-400/60 hover:text-violet-300 transition ml-0.5">
                            <svg aria-hidden width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="relative">
                      <svg aria-hidden width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${textFaint}`}>
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      <input type="search" placeholder={t.searchTask} value={taskSearch}
                        onChange={e => setTaskSearch(e.target.value)}
                        className={`${inputCls} pl-8 w-44`}/>
                    </div>
                  </div>

                  {/* tabs de status */}
                  <div className={`flex ${dark ? 'bg-white/5 border-white/8' : 'bg-slate-100 border-slate-200'} border rounded-xl p-1 gap-1 overflow-x-auto mb-3`} style={{ scrollbarWidth: 'none' }}>
                    {statusTabs.map(tab => (
                      <button key={tab.key} onClick={() => setStatusFilter(tab.key)}
                        aria-pressed={statusFilter === tab.key}
                        className={[
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                          statusFilter === tab.key
                            ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                            : dark ? 'text-white/55 hover:text-white/80' : 'text-slate-500 hover:text-slate-800',
                        ].join(' ')}>
                        {tab.label}
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                          statusFilter === tab.key
                            ? 'bg-white/20 text-white'
                            : dark ? 'bg-white/10 text-white/50' : 'bg-white text-slate-500 border border-slate-200'
                        }`}>{tab.count}</span>
                      </button>
                    ))}
                  </div>

                  {/* Prioridade — botões inline */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-semibold ${textFaint} uppercase tracking-widest mr-1`}>{t.priorityHeader}:</span>
                    <button onClick={() => setPriorityFilter('ALL')} aria-pressed={priorityFilter === 'ALL'}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        priorityFilter === 'ALL'
                          ? dark ? 'bg-white/12 text-white border-white/20' : 'bg-slate-200 text-slate-700 border-slate-300'
                          : dark ? 'border-white/10 text-white/45 hover:text-white/70' : 'border-slate-200 text-slate-400 hover:text-slate-600'
                      }`}>{t.pAll}</button>
                    {([
                      { key: 'HIGH'   as PriorityFilter, label: t.priorityHigh,   active: 'bg-red-500/15 text-red-400 border-red-500/30',       inactive: dark ? 'border-white/10 text-white/45 hover:border-red-500/30 hover:text-red-400'       : 'border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500'       },
                      { key: 'MEDIUM' as PriorityFilter, label: t.priorityMedium, active: 'bg-amber-500/15 text-amber-400 border-amber-500/30',  inactive: dark ? 'border-white/10 text-white/45 hover:border-amber-500/30 hover:text-amber-400'  : 'border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-500'  },
                      { key: 'LOW'    as PriorityFilter, label: t.priorityLow,    active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', inactive: dark ? 'border-white/10 text-white/45 hover:border-emerald-500/30 hover:text-emerald-400' : 'border-slate-200 text-slate-400 hover:border-emerald-300 hover:text-emerald-500' },
                    ]).map(p => (
                      <button key={p.key}
                        onClick={() => setPriorityFilter(prev => prev === p.key ? 'ALL' : p.key)}
                        aria-pressed={priorityFilter === p.key}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${priorityFilter === p.key ? p.active : p.inactive}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* tabela */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className={`border-b ${tableBdr}`}>
                        {t.tableHeaders.map(h => (
                          <th key={h} scope="col"
                            className={`px-4 py-3 font-semibold uppercase tracking-widest text-[10px] ${textFaint} whitespace-nowrap`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedTasks.map(task => {
                        const assignee  = userMap[task.userId]
                        const isOverdue = (task.status === 'PENDING' || task.status === 'IN_PROGRESS') && !!task.dueDate && task.dueDate < today
                        const sc = statusCfg[task.status] ?? { label: task.status, dot: 'bg-slate-400', badge: '' }
                        const pc = priorityCfg[task.priority] ?? { label: task.priority, badge: '' }
                        return (
                          <tr key={task._id} className={`border-b ${tableBdr} ${trHover} transition`}>
                            <td className="px-4 py-3 max-w-[260px]">
                              <p className={`text-xs font-semibold ${text} truncate`} title={task.title}>{task.title}</p>
                              {task.description && (
                                <p className={`text-[11px] ${textFaint} truncate mt-0.5`} title={task.description}>{task.description}</p>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${sc.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} flex-shrink-0`}/>
                                {sc.label}
                                {isOverdue && (
                                  <span className="ml-1 px-1 rounded text-[9px] font-black bg-orange-500/20 text-orange-400 border border-orange-400/20">{t.overdueTag}</span>
                                )}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${pc.badge}`}>{pc.label}</span>
                            </td>
                            <td className="px-4 py-3">
                              {assignee ? (
                                <button
                                  onClick={() => setAssigneeFilter(uid(assignee) === assigneeFilter ? 'ALL' : uid(assignee))}
                                  className="flex items-center gap-2 group"
                                  title={assigneeFilter === uid(assignee) ? `Remover filtro de ${assignee.name}` : `Filtrar por ${assignee.name}`}>
                                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 transition ${assigneeFilter === uid(assignee) ? 'ring-2 ring-violet-400' : ''}`}>
                                    {assignee.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className={`text-xs whitespace-nowrap transition ${assigneeFilter === uid(assignee) ? 'text-violet-400 font-semibold' : `${textMuted} group-hover:text-violet-400`}`}>
                                    {assignee.name}
                                  </span>
                                </button>
                              ) : (
                                <span className={`text-xs ${textFaint}`}>—</span>
                              )}
                            </td>
                            <td className={`px-4 py-3 text-xs whitespace-nowrap ${isOverdue ? 'text-orange-400 font-semibold' : textMuted}`}>
                              {fmtDate(task.dueDate)}
                            </td>
                            <td className={`px-4 py-3 text-xs ${textFaint} whitespace-nowrap`}>
                              {fmtDate(task.createdAt)}
                            </td>
                          </tr>
                        )
                      })}
                      {paginatedTasks.length === 0 && (
                        <tr>
                          <td colSpan={6} className={`px-4 py-14 text-center text-sm ${textFaint}`}>
                            {t.noTasksMsg}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* paginação */}
                {taskTotalPages > 1 && (
                  <div className={`flex items-center justify-between px-5 py-3 border-t ${tableBdr}`}>
                    <span className={`text-xs ${textFaint}`}>{t.pageLbl} {safePage} {t.ofLbl} {taskTotalPages}</span>
                    <div className="flex gap-1">
                      <button onClick={() => setTaskPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition font-medium ${dark ? 'border-white/10 text-white/50 hover:bg-white/5 disabled:opacity-30' : 'border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30'}`}>
                        {t.prevBtn}
                      </button>
                      {Array.from({ length: Math.min(5, taskTotalPages) }, (_, i) => {
                        const p = safePage <= 3 ? i + 1 : safePage + i - 2
                        if (p < 1 || p > taskTotalPages) return null
                        return (
                          <button key={p} onClick={() => setTaskPage(p)}
                            className={`text-xs px-2.5 py-1 rounded-lg border transition font-medium ${p === safePage ? 'bg-violet-600 border-violet-600 text-white' : dark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                            {p}
                          </button>
                        )
                      })}
                      <button onClick={() => setTaskPage(p => Math.min(taskTotalPages, p + 1))} disabled={safePage === taskTotalPages}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition font-medium ${dark ? 'border-white/10 text-white/50 hover:bg-white/5 disabled:opacity-30' : 'border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30'}`}>
                        {t.nextBtn}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
