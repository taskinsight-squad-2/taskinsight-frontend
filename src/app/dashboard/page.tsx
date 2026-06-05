'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { translations, type Locale } from '@/lib/i18n'
import { taskService } from '@/services/task.service'
import { analyticsApi } from '@/services/analytics.service'
import type { Task as ApiTask } from '@/types/task'
import type { MetricsByStatusResponse, MetricsByPriorityResponse, AverageTimeResponse, ThroughputResponse, BacklogResponse, ResponseTimeResponse } from '@/types/analytics'
import { triggerVLibras } from '@/components/VLibras'
import { useA11yPrefs } from '@/hooks/useA11yPrefs'

type Priority = 'High' | 'Medium' | 'Low'
type Status   = 'Pending' | 'InProgress' | 'Done'
type FilterTab = 'All' | 'Pending' | 'InProgress' | 'Done' | 'Overdue'
type SortMode  = 'default' | 'created' | 'completed' | 'overdue'

interface AnalyticsResult {
  status: MetricsByStatusResponse | null
  priority: MetricsByPriorityResponse | null
  averageTime: AverageTimeResponse | null
  throughput: ThroughputResponse | null
  backlog: BacklogResponse | null
  responseTime: ResponseTimeResponse | null
}

interface TaskDates {
  created:          string
  started:          string | null
  finished:         string | null
  deadline:         string | null
  originalDeadline: string | null
}

function mapStatus(s: ApiTask['status']): Status {
  if (s === 'IN_PROGRESS') return 'InProgress'
  if (s === 'DONE')        return 'Done'
  return 'Pending'
}

function mapPriority(p: ApiTask['priority']): Priority {
  if (p === 'HIGH')   return 'High'
  if (p === 'MEDIUM') return 'Medium'
  return 'Low'
}

function today() { return new Date().toISOString().slice(0, 10) }
function fmt(d: string | null) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}
function daysBetween(a: string | null, b: string | null) {
  if (!a || !b) return null
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.max(0, Math.round(ms / 86_400_000))
}
function slaInfo(originalDeadline: string | null, finished: string | null): { days: number; onTime: boolean } | null {
  if (!originalDeadline || !finished) return null
  const ms = new Date(finished).getTime() - new Date(originalDeadline).getTime()
  const days = Math.round(Math.abs(ms) / 86_400_000)
  return { days, onTime: ms <= 0 }
}

export default function DashboardPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const isNew        = searchParams.get('new') === 'true'
  const [locale, setLocale] = useState<Locale>('pt')
  const t = translations[locale]
  const { prefs, set: setPrefs }      = useA11yPrefs()
  const dark                          = prefs.darkMode

  const [userName, setUserName] = useState('')
  const [greeting, setGreeting] = useState('')
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const u = JSON.parse(stored)
        setUserName(u.name?.split(' ')[0] ?? '')
      }
    } catch {}
    setGreeting(t.greeting(new Date().getHours()))
  }, [t])
  const [filter, setFilter]           = useState<FilterTab>('All')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sortMode, setSortMode]       = useState<SortMode>('default')
  const [pageSize, setPageSize]       = useState(5)
  const [page, setPage]               = useState(1)

  // ── API tasks ────────────────────────────────────────────────────
  const [apiTasks, setApiTasks] = useState<ApiTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (!stored) { router.replace('/login'); return }
  }, [router])

  useEffect(() => {
    function clearSession() {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
    window.addEventListener('beforeunload', clearSession)
    return () => window.removeEventListener('beforeunload', clearSession)
  }, [])

  const fetchTasks = useCallback(async () => {
    const token = localStorage.getItem('token') ?? undefined
    if (!token) return
    try {
      const data = await taskService.getAll(token)
      setApiTasks(Array.isArray(data) ? data : [])
    } catch {
      setApiTasks([])
    } finally {
      setLoadingTasks(false)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  // ── analytics ─────────────────────────────────────────────────────
  const [analytics, setAnalytics] = useState<AnalyticsResult | null>(null)

  const loadAnalytics = useCallback(async () => {
    const tok = localStorage.getItem('token') ?? undefined
    if (!tok) return
    try {
      const status = await analyticsApi.getByStatus(tok)
      let backlog = null
      if (status.data.DONE.count > 0) {
        backlog = await analyticsApi.getBacklog(tok).catch(() => null)
      }
      const [priority, averageTime, throughput, responseTime] = await Promise.all([
        analyticsApi.getByPriority(tok),
        analyticsApi.getAverageTime(tok),
        analyticsApi.getThroughput(tok),
        analyticsApi.getResponseTime(tok),
      ])
      setAnalytics({ status, priority, averageTime, throughput, backlog, responseTime })
    } catch {
      setAnalytics(null)
    }
  }, [])

  useEffect(() => { loadAnalytics() }, [loadAnalytics])

  // ── task state ───────────────────────────────────────────────────
  const [taskStatuses,  setTaskStatuses]  = useState<Record<string, Status>>({})
  const [taskDates,  setTaskDates]  = useState<Record<string, TaskDates>>({})

  useEffect(() => {
    if (apiTasks.length === 0) return
    setTaskStatuses(Object.fromEntries(apiTasks.map(t => [t._id, mapStatus(t.status)])))
    setTaskDates(Object.fromEntries(apiTasks.map(t => [t._id, {
      created:          t.createdAt?.slice(0, 10) ?? today(),
      started:          t.startedAt?.slice(0, 10) ?? null,
      finished:         t.completedAt?.slice(0, 10) ?? null,
      deadline:         t.dueDate?.slice(0, 10) ?? null,
      originalDeadline: t.originalDueDate?.slice(0, 10) ?? null,
    }])))
    setDeadlineHistory(Object.fromEntries(
      apiTasks
        .filter(t => t.deadlineHistory?.length)
        .map(t => [t._id, t.deadlineHistory!.map(entry => ({
          oldDate:   entry.oldDate ? entry.oldDate.slice(0, 10) : null,
          newDate:   entry.newDate.slice(0, 10),
          reason:    entry.reason,
          changedAt: new Date(entry.changedAt).toLocaleDateString('pt-BR'),
        }))])
    ))
    setDescriptions(Object.fromEntries(apiTasks.filter(t => t.description).map(t => [t._id, t.description])))
  }, [apiTasks])
  const [expanded,   setExpanded]   = useState<Record<string, boolean>>({})
  const [editing,    setEditing]    = useState<Record<string, boolean>>({})
  const [descriptions, setDescriptions] = useState<Record<string, string>>({})
  const [draftDesc,  setDraftDesc]  = useState<Record<string, string>>({})
  const [deadlineDraft, setDeadlineDraft] = useState<Record<string, string>>({})
  const [editingDeadlineId, setEditingDeadlineId] = useState<string | null>(null)
  const [confirmDeadlineId, setConfirmDeadlineId] = useState<string | null>(null)
  const [deadlineChangeReason, setDeadlineChangeReason] = useState('')
  const [deadlineChangeStep, setDeadlineChangeStep] = useState<'ask' | 'edit' | null>(null)
  const [deadlineHistory, setDeadlineHistory] = useState<Record<string, Array<{oldDate: string | null, newDate: string, reason: string, changedAt: string}>>>({})
  const [editingTitle, setEditingTitle] = useState<Record<string, boolean>>({})
  const [draftTitle,   setDraftTitle]   = useState<Record<string, string>>({})
  const [toastMsg, setToastMsg]     = useState('')
  const [chartHoverIdx, setChartHoverIdx] = useState<number | null>(null)

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? undefined : undefined

  const [confirmStartId, setConfirmStartId] = useState<string | null>(null)

  async function confirmStart(id: string) {
    setConfirmStartId(null)
    await taskService.update(id, { status: 'IN_PROGRESS' }, token).catch(() => {})
    await fetchTasks()
  }
  async function finishTask(id: string) {
    const dates = taskDates[id]
    if (!dates?.started) { showToast('⚠ Inicie a tarefa antes de concluí-la.'); return }
    setTaskStatuses(prev => ({ ...prev, [id]: 'Done' }))
    setTaskDates(prev => ({ ...prev, [id]: { ...prev[id], finished: today() } }))
    await taskService.update(id, { status: 'DONE' }, token).catch(() => {})
  }
  async function reopenTask(id: string) {
    setTaskStatuses(prev => ({ ...prev, [id]: 'InProgress' }))
    setTaskDates(prev => ({ ...prev, [id]: { ...prev[id], finished: null } }))
    await taskService.update(id, { status: 'IN_PROGRESS' }, token).catch(() => {})
  }
  async function saveDeadline(id: string) {
    const val = deadlineDraft[id] ?? ''
    if (!val) return
    const hasExisting = !!taskDates[id]?.deadline
    if (hasExisting) { setConfirmDeadlineId(id); return }
    const isoVal = new Date(val + 'T12:00:00.000Z').toISOString()
    setTaskDates(prev => ({ ...prev, [id]: { ...prev[id], deadline: val } }))
    setEditingDeadlineId(null)
    await taskService.update(id, { dueDate: isoVal }, token).catch(() => {})
    showToast('✓ Prazo salvo!')
  }

  async function confirmDeadlineChange(id: string) {
    const val = deadlineDraft[id] || taskDates[id]?.deadline || ''
    if (!val || !deadlineChangeReason.trim()) return
    const isoVal = new Date(val + 'T12:00:00.000Z').toISOString()
    const changedAt = new Date().toLocaleDateString('pt-BR')
    const oldDate = taskDates[id]?.deadline ?? null
    setDeadlineHistory(prev => ({
      ...prev,
      [id]: [...(prev[id] ?? []), { oldDate, newDate: val, reason: deadlineChangeReason.trim(), changedAt }]
    }))
    setTaskDates(prev => ({ ...prev, [id]: { ...prev[id], deadline: val } }))
    setEditingDeadlineId(null)
    setConfirmDeadlineId(null)
    setDeadlineChangeStep(null)
    setDeadlineChangeReason('')
    setDeadlineDraft(prev => ({ ...prev, [id]: '' }))
    await taskService.update(id, { dueDate: isoVal, deadlineChangeReason: deadlineChangeReason.trim() }, token).catch(() => {})
    showToast('✓ Prazo atualizado!')
  }

  function toggleExpand(id: string) { setExpanded(prev => ({ ...prev, [id]: !prev[id] })) }
  function startEdit(id: string)    { setDraftDesc(prev => ({ ...prev, [id]: descriptions[id] ?? '' })); setEditing(prev => ({ ...prev, [id]: true })) }
  function saveDesc(id: string)     { setDescriptions(prev => ({ ...prev, [id]: draftDesc[id] ?? '' })); setEditing(prev => ({ ...prev, [id]: false })) }
  function cancelEdit(id: string)   { setEditing(prev => ({ ...prev, [id]: false })) }

  function startEditTitle(id: string, current: string) {
    setDraftTitle(prev => ({ ...prev, [id]: current }))
    setEditingTitle(prev => ({ ...prev, [id]: true }))
  }
  async function saveTitle(id: string) {
    const val = draftTitle[id]?.trim()
    if (!val) return
    setApiTasks(prev => prev.map(t => t._id === id ? { ...t, title: val } : t))
    setEditingTitle(prev => ({ ...prev, [id]: false }))
    await taskService.update(id, { title: val }, token).catch(() => {})
  }
  function cancelEditTitle(id: string) { setEditingTitle(prev => ({ ...prev, [id]: false })) }

  async function saveDescToBank(id: string) {
    const val = draftDesc[id] ?? ''
    setDescriptions(prev => ({ ...prev, [id]: val }))
    setEditing(prev => ({ ...prev, [id]: false }))
    await taskService.update(id, { description: val }, token).catch(() => {})
  }

  // ── criar tarefa ─────────────────────────────────────────────────
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskForm, setNewTaskForm] = useState({ title: '', description: '', priority: 'MEDIUM' as ApiTask['priority'] })
  const [savingTask, setSavingTask]   = useState(false)

  const trapNewTask  = useFocusTrap(showNewTask)
  const trapDeadline = useFocusTrap(!!confirmDeadlineId)
  const trapStart    = useFocusTrap(!!confirmStartId)

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTaskForm.title.trim()) return
    setSavingTask(true)
    try {
      await taskService.create({ title: newTaskForm.title, description: newTaskForm.description, priority: newTaskForm.priority }, token)
      setNewTaskForm({ title: '', description: '', priority: 'MEDIUM' })
      setShowNewTask(false)
      await fetchTasks()
      showToast('✓ Tarefa criada com sucesso!')
    } catch { showToast('Erro ao criar tarefa.') }
    finally { setSavingTask(false) }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  function completeAll() { setTaskStatuses(prev => Object.fromEntries(Object.keys(prev).map(k => [k, 'Done' as Status]))) }
  function clearDone()   { setTaskStatuses(prev => Object.fromEntries(Object.entries(prev).filter(([, v]) => v !== 'Done'))) }

  // ── derived data ─────────────────────────────────────────────────
  const tasks = useMemo(() => apiTasks.map(apiTask => ({
    id: apiTask._id,
    title: apiTask.title,
    category: apiTask.description ?? '',
    priority: mapPriority(apiTask.priority),
    status: (taskStatuses[apiTask._id] ?? mapStatus(apiTask.status)) as Status,
  })), [apiTasks, taskStatuses])
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'All'>('All')
  function setPriorityFilterReset(p: Priority | 'All') { setPriorityFilter(p); setPage(1) }

  const categories = useMemo(() => [
    { label: t.priorityHigh,   count: tasks.filter(t => t.priority === 'High').length,   priority: 'High'   as Priority, dot: 'bg-red-400'     },
    { label: t.priorityMedium, count: tasks.filter(t => t.priority === 'Medium').length, priority: 'Medium' as Priority, dot: 'bg-amber-400'   },
    { label: t.priorityLow,    count: tasks.filter(t => t.priority === 'Low').length,    priority: 'Low'    as Priority, dot: 'bg-emerald-400' },
  ], [tasks, t])

  const total      = tasks.length
  const nPending   = tasks.filter(t => t.status === 'Pending').length
  const nProgress  = tasks.filter(t => t.status === 'InProgress').length
  const nDone      = tasks.filter(t => t.status === 'Done').length
  const completion = total > 0 ? Math.round((nDone / total) * 100) : 0

  const nOverdue = useMemo(() => tasks.filter(t =>
    (t.status === 'Pending' || t.status === 'InProgress') &&
    taskDates[t.id]?.deadline && taskDates[t.id].deadline! < today()
  ).length, [tasks, taskDates])

  const filtered = useMemo(() => {
    let list = filter === 'Overdue'
      ? tasks.filter(t => (t.status === 'Pending' || t.status === 'InProgress') && taskDates[t.id]?.deadline && taskDates[t.id].deadline! < today())
      : filter === 'All' ? tasks : tasks.filter(t => t.status === filter)
    if (priorityFilter !== 'All') list = list.filter(t => t.priority === priorityFilter)
    return list
  }, [filter, tasks, taskDates, priorityFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // reset page on filter/pageSize change
  function setFilterReset(f: FilterTab) { setFilter(f); setPage(1) }
  function setPageSizeReset(n: number)  { setPageSize(n); setPage(1) }
  function setSortReset(s: SortMode)    { setSortMode(s); setPage(1) }

  // ── tokens por tema ───────────────────────────────────────────────
  const pageBg       = dark ? 'bg-[#080B14]'    : 'bg-[#F4F6FB]'
  const sidebarBg    = dark ? 'bg-[#0D1117]'    : 'bg-white'
  const sidebarBdr   = dark ? 'border-white/5'  : 'border-slate-200'
  const headerBg     = dark ? 'bg-[#080B14]/90' : 'bg-white/90'
  const headerBdr    = dark ? 'border-white/5'  : 'border-slate-200'
  const text         = dark ? 'text-white'       : 'text-slate-900'
  const textMuted    = dark ? 'text-white/70'    : 'text-slate-600'
  const textFaint    = dark ? 'text-white/55'    : 'text-slate-500'
  const sectionLbl   = dark ? 'text-white/55'    : 'text-slate-500'
  const navInact     = dark ? 'text-white/55 hover:text-white/80 hover:bg-white/5' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
  const navAct       = dark ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'bg-violet-50 text-violet-600 border border-violet-200'
  const catItem      = dark ? 'text-white/55 hover:text-white/75 hover:bg-white/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
  const catBadge     = dark ? 'bg-white/5 border-white/10 text-white/45' : 'bg-slate-100 border-slate-200 text-slate-500'
  const userPlan     = dark ? 'text-white/40'   : 'text-slate-400'
  const ctrlBg       = dark ? 'bg-white/5 border-white/10 text-white/65' : 'bg-white border-slate-200 text-slate-600'
  const cardBg       = dark ? 'bg-white/[0.03] border-white/8' : 'bg-white border-slate-200'
  const progressBg   = dark ? 'bg-white/5'      : 'bg-slate-100'
  const filterBg     = dark ? 'bg-white/5 border-white/8' : 'bg-slate-100 border-slate-200'
  const filterInact  = dark ? 'text-white/55 hover:text-white/80' : 'text-slate-500 hover:text-slate-800'
  const listBdr      = dark ? 'border-white/5'  : 'border-slate-100'
  const taskHover    = dark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/70'
  const taskDoneCls  = dark ? 'line-through text-white/35' : 'line-through text-slate-400'
  const taskActiveCls = dark ? 'text-white/90'  : 'text-slate-800'
  const taskCat      = dark ? 'text-white/40'   : 'text-slate-400'
  const emptyIcon    = dark ? 'bg-white/5 border-white/8 text-white/20' : 'bg-slate-100 border-slate-200 text-slate-300'
  const checkEmpty   = dark ? 'border-white/15 group-hover:border-violet-500/50' : 'border-slate-300 group-hover:border-violet-400'
  const mobileTrigger = dark ? 'text-white/40 hover:text-white/70' : 'text-slate-400 hover:text-slate-700'
  const mobileOverlay = dark ? 'bg-black/60' : 'bg-black/30'
  const descAreaBg   = dark ? 'bg-white/[0.03] border-white/8' : 'bg-slate-50 border-slate-200'
  const descTextCls  = dark ? 'text-white/70'   : 'text-slate-600'
  const textareaCls  = dark
    ? 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/60 resize-none transition'
    : 'w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-violet-400 resize-none transition'
  const inputDateCls = dark
    ? 'bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-violet-500/60 transition'
    : 'bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 outline-none focus:border-violet-400 transition'
  const timelineLbl  = dark ? 'text-white/55'   : 'text-slate-500'
  const timelineVal  = dark ? 'text-white/85'   : 'text-slate-700'
  const chevronCls   = dark ? 'text-white/55 hover:text-white/80' : 'text-slate-500 hover:text-slate-700'
  const showDescCls  = dark ? 'text-white/55 hover:text-white/80' : 'text-slate-500 hover:text-slate-700'
  const editBtnCls   = dark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-500 hover:text-violet-700'
  const pagBtnBase   = `text-xs px-2.5 py-1 rounded-lg border transition font-medium`
  const pagBtnActive = dark ? 'bg-violet-600 border-violet-600 text-white' : 'bg-violet-600 border-violet-600 text-white'
  const pagBtnInact  = dark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'

  const priorityConfig: Record<Priority, { color: string; dot: string }> = dark ? {
    High:   { color: 'bg-red-500/10 text-red-400 border border-red-500/20',    dot: 'bg-red-400'    },
    Medium: { color: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', dot: 'bg-amber-400' },
    Low:    { color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', dot: 'bg-emerald-400' },
  } : {
    High:   { color: 'bg-red-50 text-red-600 border border-red-200',    dot: 'bg-red-500'    },
    Medium: { color: 'bg-amber-50 text-amber-600 border border-amber-200', dot: 'bg-amber-500' },
    Low:    { color: 'bg-emerald-50 text-emerald-600 border border-emerald-200', dot: 'bg-emerald-500' },
  }

  const statusConfig: Record<Status, { color: string; label: string }> = dark ? {
    Pending:    { color: 'bg-slate-500/10 text-slate-400 border border-slate-500/20',   label: 'Pendente'    },
    InProgress: { color: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',      label: 'Em andamento' },
    Done:       { color: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', label: 'Concluída' },
  } : {
    Pending:    { color: 'bg-slate-100 text-slate-500 border border-slate-200',   label: 'Pendente'    },
    InProgress: { color: 'bg-blue-50 text-blue-600 border border-blue-200',       label: 'Em andamento' },
    Done:       { color: 'bg-emerald-50 text-emerald-600 border border-emerald-200', label: 'Concluída' },
  }

  const navItems: { label: string; icon: React.ReactNode; sort: SortMode; badge?: number }[] = [
    { label: t.dashboard, sort: 'default', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  ]

  const filterTabs: { key: FilterTab; label: string; badge?: number }[] = [
    { key: 'All',        label: t.all },
    { key: 'Pending',    label: 'Pendente' },
    { key: 'InProgress', label: 'Em andamento' },
    { key: 'Done',       label: t.statusDone },
    { key: 'Overdue',    label: 'Em atraso', badge: nOverdue },
  ]

  // ── semanas do gráfico ─────────────────────────────────────────
  const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  const [chartMonth, setChartMonth] = useState<{ year: number; month: number }>(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() }
  })
  const [chartWeek, setChartWeek] = useState<number>(() => Math.ceil(new Date().getDate() / 7))

  function getWeekDates(year: number, month: number, week: number): string[] {
    const lastDay = new Date(year, month + 1, 0).getDate()
    const start = (week - 1) * 7 + 1
    const end   = Math.min(week * 7, lastDay)
    if (start > lastDay) return []
    const dates: string[] = []
    for (let d = start; d <= end; d++) {
      const iso = new Date(year, month, d)
      dates.push(`${iso.getFullYear()}-${String(iso.getMonth()+1).padStart(2,'0')}-${String(iso.getDate()).padStart(2,'0')}`)
    }
    return dates
  }

  function totalWeeks(year: number, month: number) {
    return Math.ceil(new Date(year, month + 1, 0).getDate() / 7)
  }

  function prevWeek() {
    if (chartWeek > 1) {
      setChartWeek(w => w - 1)
    } else {
      const pm = chartMonth.month === 0
        ? { year: chartMonth.year - 1, month: 11 }
        : { year: chartMonth.year, month: chartMonth.month - 1 }
      setChartMonth(pm)
      setChartWeek(totalWeeks(pm.year, pm.month))
    }
  }

  function nextWeek() {
    if (chartWeek < totalWeeks(chartMonth.year, chartMonth.month)) {
      setChartWeek(w => w + 1)
    } else {
      const nm = chartMonth.month === 11
        ? { year: chartMonth.year + 1, month: 0 }
        : { year: chartMonth.year, month: chartMonth.month + 1 }
      setChartMonth(nm)
      setChartWeek(1)
    }
  }

  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear()
    const taskYears = new Set(apiTasks.map(t => Number(t.createdAt?.slice(0, 4))).filter(y => y >= 2026))
    for (let y = 2026; y <= currentYear + 1; y++) taskYears.add(y)
    return [...taskYears].sort()
  }, [apiTasks])

  const weekLabel = `Semana ${chartWeek} — ${monthNames[chartMonth.month]} ${chartMonth.year}`

  // ── dados dos gráficos ─────────────────────────────────────────
  const chartData = useMemo(() => {
    const points = getWeekDates(chartMonth.year, chartMonth.month, chartWeek)
    if (points.length === 0) return null
    const n = points.length
    const planned  = points.map((_, i) => Math.round((total / Math.max(1, n - 1)) * i))
    const done     = points.map(date => apiTasks.filter(t => {
      const isDone   = taskStatuses[t._id] === 'Done'
      const finished = taskDates[t._id]?.finished ?? (isDone ? today() : null)
      return finished && finished <= date
    }).length)
    const progress = points.map(date => apiTasks.filter(t => {
      if (taskStatuses[t._id] === 'Done') return false
      const started  = taskDates[t._id]?.started
      const finished = taskDates[t._id]?.finished
      return started && started <= date && (!finished || finished > date)
    }).length)
    const labels = points.map(d => { const [,m,day] = d.split('-'); return `${day}/${m}` })
    return { points, planned, done, progress, labels }
  }, [apiTasks, taskDates, taskStatuses, total, chartMonth, chartWeek])

  const GW = 560; const GH = 220; const GP = 44
  const nPoints  = chartData?.labels.length ?? 7
  const plannedSeries  = chartData?.planned  ?? Array(7).fill(0)
  const doneSeries     = chartData?.done     ?? Array(7).fill(0)
  const progressSeries = chartData?.progress ?? Array(7).fill(0)
  const chartLabels    = chartData?.labels   ?? Array(7).fill('')
  const gMax = Math.max(...plannedSeries, ...doneSeries, ...progressSeries, total, 1)
  function gx(i: number) { return GP + i * ((GW - GP * 2) / Math.max(1, nPoints - 1)) }
  function gy(v: number) { return GH - GP - Math.round(((v - 1) / Math.max(1, gMax - 1)) * (GH - GP * 2)) }
  function makePath(series: number[]) {
    return series.map((v, i) => {
      if (i === 0) return `M ${gx(i)} ${gy(v)}`
      const prev = series[i - 1]
      const cx = (gx(i - 1) + gx(i)) / 2
      return `C ${cx} ${gy(prev)} ${cx} ${gy(v)} ${gx(i)} ${gy(v)}`
    }).join(' ')
  }
  const pathPlanned  = makePath(plannedSeries)
  const pathDone     = makePath(doneSeries)
  const pathProgress = makePath(progressSeries)
  const areaDeviation = `${pathDone} L ${gx(nPoints-1)} ${gy(plannedSeries[nPoints-1])} ` +
    [...plannedSeries].reverse().map((v, i) => {
      const ri = nPoints - 1 - i
      if (i === 0) return `L ${gx(ri)} ${gy(v)}`
      const next = plannedSeries[ri + 1]
      const cx = (gx(ri) + gx(ri + 1)) / 2
      return `C ${cx} ${gy(next)} ${cx} ${gy(v)} ${gx(ri)} ${gy(v)}`
    }).join(' ') + ' Z'

  const collapsed = sidebarCollapsed

  const sidebar = (
    <aside
      aria-label="Menu lateral de navegação"
      className={`flex-shrink-0 ${sidebarBg} border-r ${sidebarBdr} flex flex-col h-full transition-all duration-300 overflow-hidden`}
      style={{ width: collapsed ? 60 : 256 }}
    >
      {/* header com toggle */}
      <div className={`flex items-center border-b ${sidebarBdr} transition-all duration-300 ${collapsed ? 'justify-center px-0 py-5' : 'gap-2.5 px-5 py-5'}`}>
        {!collapsed && (
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
        )}
        {!collapsed && <span className={`font-bold ${text} text-base tracking-tight flex-1`}>TaskFlow</span>}
        <button
          onClick={() => setSidebarCollapsed(v => !v)}
          aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
          aria-expanded={!collapsed}
          className={`w-7 h-7 flex items-center justify-center rounded-lg ${dark ? 'text-white/35 hover:bg-white/8 hover:text-white/70' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'} transition flex-shrink-0`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .3s' }}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      {/* nav */}
      <nav aria-label="Navegação principal" className="flex flex-col gap-0.5 px-2 py-4 flex-1 overflow-y-auto overflow-x-hidden">
        {!collapsed && <p className={`text-[10px] font-bold ${sectionLbl} uppercase tracking-[0.15em] px-3 mb-2`}>{t.menu}</p>}
        {navItems.map(item => (
          <button key={item.label}
            title={collapsed ? item.label : undefined}
            onClick={() => setSortReset(item.sort)}
            className={`flex items-center rounded-xl text-sm font-medium transition-all w-full ${
              collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5 text-left'
            } ${sortMode === item.sort ? navAct : navInact}`}>
            {item.icon}
            {!collapsed && <span className="flex-1">{item.label}</span>}
            {!collapsed && item.badge !== undefined && item.badge > 0 && (
              <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">{item.badge}</span>
            )}
          </button>
        ))}

        {!collapsed && (
          <>
            <div className="flex items-center px-3 mt-6 mb-2">
              <p className={`text-[10px] font-bold ${sectionLbl} uppercase tracking-[0.15em]`}>{t.categories}</p>
            </div>
            <button
              onClick={() => setPriorityFilterReset('All')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition ${priorityFilter === 'All' ? navAct : catItem}`}>
              <span className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dark ? 'bg-white/30' : 'bg-slate-400'}`} />
                Todas
              </span>
              <span className={`text-[11px] border rounded-full px-2 py-0.5 font-mono ${priorityFilter === 'All' ? (dark ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-violet-100 border-violet-200 text-violet-600') : catBadge}`}>
                {tasks.length}
              </span>
            </button>
            {categories.map(cat => {
              const isActive = priorityFilter === cat.priority
              return (
                <button key={cat.label} onClick={() => setPriorityFilterReset(isActive ? 'All' : cat.priority)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition ${isActive ? navAct : catItem}`}>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cat.dot}`} />
                    {cat.label}
                  </span>
                  <span className={`text-[11px] border rounded-full px-2 py-0.5 font-mono ${isActive ? (dark ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-violet-100 border-violet-200 text-violet-600') : `${catBadge}`}`}>{cat.count}</span>
                </button>
              )
            })}
          </>
        )}
      </nav>

      {/* footer */}
      <div className={`border-t ${sidebarBdr} flex items-center transition-all duration-300 ${collapsed ? 'justify-center px-2 py-4' : 'gap-3 px-4 py-4'}`}>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">HU</div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${text} truncate`}>{userName || 'Usuário'}</p>
              <p className={`text-xs ${userPlan}`}>{t.freePlan}</p>
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              {t.signOut}
            </button>
          </>
        )}
      </div>
    </aside>
  )

  return (
    <div className={`min-h-screen flex ${pageBg} ${text} transition-colors duration-300`}>

      {/* modal nova tarefa */}
      {showNewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="modal-new-task-title">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowNewTask(false)} aria-hidden="true" />
          <div ref={trapNewTask} className={`relative w-full max-w-md mx-4 ${dark ? 'bg-[#0D1117] border-white/10' : 'bg-white border-slate-200'} border rounded-2xl p-6 shadow-2xl`}>
            <h2 id="modal-new-task-title" className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-900'} mb-5`}>Nova Tarefa</h2>
            <form onSubmit={handleCreateTask} className="flex flex-col gap-4" aria-label="Criar nova tarefa">
              <div>
                <label htmlFor="new-task-title" className={`text-xs font-semibold ${dark ? 'text-white/65' : 'text-slate-600'} uppercase tracking-widest mb-1.5 block`}>Título</label>
                <input id="new-task-title" required placeholder="Nome da tarefa" value={newTaskForm.title}
                  onChange={e => setNewTaskForm(f => ({ ...f, title: e.target.value }))}
                  className={dark ? 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-violet-500/60 transition' : 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 transition'} />
              </div>
              <div>
                <label htmlFor="new-task-desc" className={`text-xs font-semibold ${dark ? 'text-white/65' : 'text-slate-600'} uppercase tracking-widest mb-1.5 block`}>Descrição</label>
                <textarea id="new-task-desc" rows={3} placeholder="Descrição opcional" value={newTaskForm.description}
                  onChange={e => setNewTaskForm(f => ({ ...f, description: e.target.value }))}
                  className={dark ? 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-violet-500/60 resize-none transition' : 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 resize-none transition'} />
              </div>
              <div>
                <label htmlFor="new-task-priority" className={`text-xs font-semibold ${dark ? 'text-white/65' : 'text-slate-600'} uppercase tracking-widest mb-1.5 block`}>Prioridade</label>
                <select id="new-task-priority" value={newTaskForm.priority} onChange={e => setNewTaskForm(f => ({ ...f, priority: e.target.value as ApiTask['priority'] }))}
                  style={{ backgroundColor: dark ? '#0D1117' : undefined }}
                  className={dark ? 'w-full bg-[#0D1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500/60 transition' : 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400 transition'}>
                  <option value="HIGH" style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>Alta</option>
                  <option value="MEDIUM" style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>Média</option>
                  <option value="LOW" style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>Baixa</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end mt-1">
                <button type="button" onClick={() => setShowNewTask(false)}
                  className={`px-4 py-2 rounded-xl text-sm border ${dark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} transition`}>
                  Cancelar
                </button>
                <button type="submit" disabled={savingTask}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50"
                  aria-busy={savingTask}>
                  {savingTask ? 'Salvando...' : 'Criar Tarefa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* modal alterar prazo — 2 etapas */}
      {confirmDeadlineId && (() => {
        const taskTitle = tasks.find(t => t.id === confirmDeadlineId)?.title ?? ''
        const oldDate   = fmt(taskDates[confirmDeadlineId]?.deadline ?? null)
        const newDate   = fmt(deadlineDraft[confirmDeadlineId] ?? null)
        const closeModal = () => { setConfirmDeadlineId(null); setDeadlineChangeStep(null); setDeadlineChangeReason(''); setDeadlineDraft(prev => ({ ...prev, [confirmDeadlineId]: '' })) }
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="modal-deadline-title">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} aria-hidden="true" />
            <div ref={trapDeadline} className={`relative w-full max-w-sm mx-4 ${dark ? 'bg-[#0D1117] border-white/10' : 'bg-white border-slate-200'} border rounded-2xl p-6 shadow-2xl`}>
              <div className="flex items-center gap-3 mb-3">
                <div aria-hidden="true" className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div>
                  <p id="modal-deadline-title" className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
                    {deadlineChangeStep === 'ask' ? 'Deseja alterar o prazo?' : 'Informe a nova data e o motivo'}
                  </p>
                  <p className={`text-xs ${dark ? 'text-white/40' : 'text-slate-400'}`}>
                    {deadlineChangeStep === 'ask' ? <>Prazo atual: <span className="text-violet-500 font-semibold">{oldDate}</span></> : <>{oldDate} → <span className="text-violet-500 font-semibold">{newDate || '?'}</span></>}
                  </p>
                </div>
              </div>
              <p className={`text-xs ${dark ? 'text-white/55' : 'text-slate-500'} mb-4`}>
                <span className={`font-semibold ${dark ? 'text-white/80' : 'text-slate-700'}`}>{taskTitle}</span>
              </p>

              {/* etapa 1: confirmação */}
              {deadlineChangeStep === 'ask' && (
                <div className="flex gap-2 justify-end">
                  <button onClick={closeModal}
                    className={`px-4 py-2 rounded-xl text-sm border ${dark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} transition`}>
                    Não, cancelar
                  </button>
                  <button onClick={() => setDeadlineChangeStep('edit')}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 transition">
                    Sim, alterar
                  </button>
                </div>
              )}

              {/* etapa 2: nova data + justificativa */}
              {deadlineChangeStep === 'edit' && (
                <>
                  <div className="mb-3">
                    <label className={`text-xs font-semibold ${dark ? 'text-white/50' : 'text-slate-500'} uppercase tracking-widest mb-1.5 block`}>Nova data</label>
                    <input type="date"
                      value={deadlineDraft[confirmDeadlineId] ?? ''}
                      onChange={e => setDeadlineDraft(prev => ({ ...prev, [confirmDeadlineId]: e.target.value }))}
                      className={dark ? 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50 transition' : 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-amber-400 transition'} />
                  </div>
                  <div className="mb-4">
                    <label className={`text-xs font-semibold ${dark ? 'text-white/50' : 'text-slate-500'} uppercase tracking-widest mb-1.5 block`}>Motivo da alteração</label>
                    <textarea rows={2} placeholder="Ex: cliente solicitou extensão do prazo..."
                      value={deadlineChangeReason}
                      onChange={e => setDeadlineChangeReason(e.target.value)}
                      className={dark ? 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-amber-500/50 resize-none transition' : 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-amber-400 resize-none transition'} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={closeModal}
                      className={`px-4 py-2 rounded-xl text-sm border ${dark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} transition`}>
                      Cancelar
                    </button>
                    <button onClick={() => confirmDeadlineChange(confirmDeadlineId)}
                      disabled={!deadlineChangeReason.trim() || !deadlineDraft[confirmDeadlineId]}
                      className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 transition disabled:opacity-40 disabled:cursor-not-allowed">
                      Confirmar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )
      })()}

      {/* modal confirmar início */}
      {confirmStartId && (() => {
        const task = tasks.find(t => t.id === confirmStartId)!
        const priorityLabel = task?.priority === 'High' ? t.priorityHigh : task?.priority === 'Medium' ? t.priorityMedium : t.priorityLow
        const priorityColor = task?.priority === 'High' ? 'text-red-500' : task?.priority === 'Medium' ? 'text-amber-500' : 'text-emerald-500'
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="modal-start-title">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmStartId(null)} aria-hidden="true" />
            <div ref={trapStart} className={`relative w-full max-w-sm mx-4 ${dark ? 'bg-[#0D1117] border-white/10' : 'bg-white border-slate-200'} border rounded-2xl p-6 shadow-2xl`}>
              <div className="flex items-center gap-3 mb-3">
                <div aria-hidden="true" className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 flex-shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                  <p id="modal-start-title" className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>Iniciar tarefa agora?</p>
                  <p className={`text-xs ${dark ? 'text-white/40' : 'text-slate-400'}`}>Prioridade: <span className={`font-semibold ${priorityColor}`}>{priorityLabel}</span></p>
                </div>
              </div>
              <p className={`text-xs ${dark ? 'text-white/55' : 'text-slate-500'} mb-1`}>
                <span className={`font-semibold ${dark ? 'text-white/80' : 'text-slate-700'}`}>{task?.title}</span>
              </p>
              <p className={`text-xs ${dark ? 'text-white/40' : 'text-slate-400'} mb-5`}>
                Ao iniciar, o tempo começa a ser contado. Certifique-se de que vai trabalhar nela agora.
              </p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setConfirmStartId(null)}
                  className={`px-4 py-2 rounded-xl text-sm border ${dark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} transition`}>
                  Agora não
                </button>
                <button onClick={() => confirmStart(confirmStartId)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition shadow-lg shadow-blue-500/25">
                  Sim, iniciar!
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* toast — aria-live anuncia para leitores de tela */}
      <div role="status" aria-live="polite" aria-atomic="true" className="fixed top-5 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        {toastMsg && (
          <div className="bg-amber-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg pointer-events-auto">
            {toastMsg}
          </div>
        )}
      </div>

      <div className="hidden md:flex flex-col h-screen sticky top-0">{sidebar}</div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className={`fixed inset-0 ${mobileOverlay} backdrop-blur-sm`} onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex flex-col h-full">{sidebar}</div>
        </div>
      )}

      <main id="main-content" className="flex-1 flex flex-col min-h-screen overflow-auto" tabIndex={-1}>

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${headerBdr} ${headerBg} backdrop-blur-xl sticky top-0 z-30 transition-colors duration-300`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} aria-label="Abrir menu lateral" aria-expanded={sidebarOpen} className={`md:hidden ${mobileTrigger} transition`}>
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div>
              <h1 className={`text-base font-bold ${text} tracking-tight`}>{greeting}{userName ? `, ${userName}` : ''} 👋</h1>
              <p className="text-xs text-violet-500 mt-0.5">{t.pendingTasksMsg(nPending)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={triggerVLibras}
              aria-label="VLibras — Intérprete de Libras"
              title="VLibras"
              className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg hover:opacity-90 active:scale-95 transition-all"
              style={{ backgroundColor: '#1351B4' }}
            >
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 64 64" fill="white">
                <path d="M48 6c0-2.2-1.8-4-4-4s-4 1.8-4 4v20h-2V4c0-2.2-1.8-4-4-4s-4 1.8-4 4v22h-2V8c0-2.2-1.8-4-4-4S26 5.8 26 8v24h-2v-14c0-2.2-1.8-4-4-4s-4 1.8-4 4v18c0 14.4 9.6 22 24 22s22-8 22-22V18c0-2.2-1.8-4-4-4s-4 1.8-4 4v-12z"/>
              </svg>
              <span className="text-white text-[11px] font-bold tracking-wide">VLibras</span>
            </button>
            <select value={locale} onChange={e => setLocale(e.target.value as Locale)}
              style={{ backgroundColor: dark ? '#0D1117' : undefined }}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${ctrlBg} outline-none cursor-pointer hover:opacity-80 transition`}>
              <option style={{ backgroundColor: dark ? '#0D1117' : 'white' }} value="pt">PT-BR</option>
              <option style={{ backgroundColor: dark ? '#0D1117' : 'white' }} value="en">EN</option>
            </select>
            <button onClick={() => setPrefs('darkMode', !dark)}
              aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border ${ctrlBg} hover:opacity-80 transition text-sm`}>
              <span aria-hidden="true">{dark ? '☀️' : '🌙'}</span>
            </button>
            <button onClick={() => setShowNewTask(true)} aria-label="Criar nova tarefa" className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:from-violet-500 hover:to-indigo-500 transition shadow-lg shadow-violet-500/25">
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {t.newTask}
            </button>
          </div>
        </div>

        <div className="px-6 py-6 flex flex-col gap-5">
          {loadingTasks && (
            <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-10">
              <span aria-hidden="true" className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              <span className="text-sm text-violet-500">Carregando tarefas...</span>
            </div>
          )}

          {/* ── Stats compactos ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total',       value: total,     accent: 'text-violet-500', iconBg: 'bg-violet-500/10 border-violet-500/20', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
              { label: 'Pendente',    value: nPending,  accent: 'text-slate-500',  iconBg: 'bg-slate-500/10 border-slate-500/20',  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
              { label: 'Andamento',   value: nProgress, accent: 'text-blue-500',   iconBg: 'bg-blue-500/10 border-blue-500/20',    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
              { label: 'Concluídas',  value: nDone,     accent: 'text-emerald-500',iconBg: 'bg-emerald-500/10 border-emerald-500/20', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
            ].map(s => (
              <div key={s.label} className={`${cardBg} border rounded-xl px-4 py-3 flex items-center gap-3 transition-colors`}>
                <div className={`w-7 h-7 rounded-lg ${s.iconBg} border flex items-center justify-center ${s.accent} flex-shrink-0`}>{s.icon}</div>
                <div>
                  <p className={`text-[10px] font-semibold ${textFaint} uppercase tracking-widest`}>{s.label}</p>
                  <p className={`text-xl font-black ${text} leading-tight`}>{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* progress bar */}
          <div className={`${cardBg} border rounded-xl px-4 py-3 flex items-center gap-3`}>
            <span className={`text-xs font-semibold ${textMuted} whitespace-nowrap`} aria-hidden="true">Conclusão</span>
            <div
              role="progressbar"
              aria-valuenow={completion}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Progresso geral: ${completion}% concluído`}
              className={`flex-1 h-1.5 ${progressBg} rounded-full overflow-hidden`}
            >
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${completion}%`, background: 'linear-gradient(90deg,#7c3aed,#10b981)' }} />
            </div>
            <span className={`text-xs font-bold ${text} tabular-nums w-8 text-right`} aria-hidden="true">{completion}%</span>
          </div>

          {/* ── Task list ── */}
          <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
            {/* toolbar */}
            <div className={`flex items-center justify-between px-5 py-3 border-b ${listBdr} flex-wrap gap-2`}>
              <div className={`flex ${filterBg} border rounded-xl p-1 gap-1`}>
                {filterTabs.map(f => (
                  <button key={f.key} onClick={() => setFilterReset(f.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f.key ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : filterInact}`}>
                    {f.label}
                    {f.badge !== undefined && f.badge > 0 && (
                      <span className={`text-[10px] font-bold rounded-full px-1.5 py-px leading-none ${filter === f.key ? 'bg-white/25 text-white' : 'bg-red-500 text-white'}`}>{f.badge}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {/* page size */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs ${textFaint}`}>Mostrar</span>
                  <select value={pageSize} onChange={e => setPageSizeReset(Number(e.target.value))}
                    style={{ backgroundColor: dark ? '#0D1117' : undefined }}
                    className={`text-xs font-semibold px-2 py-1 rounded-lg border ${ctrlBg} outline-none cursor-pointer`}>
                    {[5, 10, 25].map(n => <option key={n} value={n} style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>{n}</option>)}
                  </select>
                  <span className={`text-xs ${textFaint}`}>por página</span>
                </div>
                <button onClick={completeAll} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/20 transition">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {t.completeAll}
                </button>
                <button onClick={clearDone} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  {t.clearDone}
                </button>
              </div>
            </div>

            {/* list */}
            <ul
              aria-label="Lista de tarefas"
              aria-live="polite"
              className="flex flex-col list-none m-0 p-0"
              style={{ maxHeight: 480, overflowY: 'auto' }}
            >
              {paginated.length === 0 && (
                <li role="status" className="flex flex-col items-center justify-center py-14 gap-3">
                  <div aria-hidden="true" className={`w-11 h-11 rounded-2xl ${emptyIcon} border flex items-center justify-center`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                  </div>
                  <p className={`text-sm ${textFaint}`}>{t.noTasks}</p>
                </li>
              )}
              {paginated.map(task => {
                const isExpanded = !!expanded[task.id]
                const isEditing  = !!editing[task.id]
                const savedDesc  = descriptions[task.id] ?? ''
                const draft      = draftDesc[task.id] ?? ''
                const dates      = taskDates[task.id]
                const stalled    = daysBetween(dates?.created ?? null, dates?.started ?? null)
                const inProg     = daysBetween(dates?.started ?? null, dates?.finished ?? today())
                const isRunning  = task.status === 'InProgress'
                const isPending  = task.status === 'Pending'
                const isDone     = task.status === 'Done'
                const hasProrrog = dates?.originalDeadline && dates?.deadline && dates.originalDeadline !== dates.deadline
                const sla        = slaInfo(dates?.originalDeadline ?? null, dates?.finished ?? null)

                return (
                  <li key={task.id} className={`border-b last:border-b-0 ${listBdr}`} aria-label={`Tarefa: ${task.title}, status: ${statusConfig[task.status].label}, prioridade: ${task.priority === 'High' ? t.priorityHigh : task.priority === 'Medium' ? t.priorityMedium : t.priorityLow}`}>
                    <div className={`flex items-center gap-3 px-5 py-3.5 ${taskHover} transition group`}>
                      {/* status action button */}
                      <div className="flex-shrink-0">
                        {isDone ? (
                          <button onClick={() => reopenTask(task.id)} title="Reabrir"
                            className="w-5 h-5 flex items-center justify-center rounded-full bg-emerald-500 text-white hover:bg-amber-500 transition">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </button>
                        ) : isRunning ? (
                          <button onClick={() => finishTask(task.id)} title="Concluir"
                            className="w-5 h-5 flex items-center justify-center rounded-full border-2 border-blue-400 group-hover:bg-blue-500 group-hover:border-blue-500 group-hover:text-white text-blue-400 transition">
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </button>
                        ) : (
                          <button onClick={() => setConfirmStartId(task.id)} title="Iniciar"
                            className={`w-5 h-5 flex items-center justify-center rounded-full border-2 ${checkEmpty} transition`} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {editingTitle[task.id] && !isDone ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              autoFocus
                              value={draftTitle[task.id] ?? ''}
                              onChange={e => setDraftTitle(prev => ({ ...prev, [task.id]: e.target.value }))}
                              onKeyDown={e => { if (e.key === 'Enter') saveTitle(task.id); if (e.key === 'Escape') cancelEditTitle(task.id) }}
                              className={`flex-1 text-sm font-medium rounded-lg px-2 py-1 outline-none border ${
                                dark ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                              } transition`}
                            />
                            <button onClick={() => saveTitle(task.id)} className="text-[10px] px-2 py-1 rounded-md bg-violet-600 hover:bg-violet-500 text-white font-semibold transition">ok</button>
                            <button onClick={() => cancelEditTitle(task.id)} className={`text-[10px] px-2 py-1 rounded-md border ${ dark ? 'border-white/10 text-white/50' : 'border-slate-200 text-slate-400'} transition`}>✕</button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 group/title">
                            <p className={`text-sm font-medium truncate transition ${isDone ? taskDoneCls : taskActiveCls}`}>{task.title}</p>
                            {!isDone && (
                              <button
                                onClick={() => startEditTitle(task.id, task.title)}
                                className={`opacity-0 group-hover/title:opacity-100 transition ${ dark ? 'text-white/30 hover:text-white/60' : 'text-slate-300 hover:text-slate-500'}`}
                                title="Editar título"
                              >
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${priorityConfig[task.priority].color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig[task.priority].dot}`} />
                            {task.priority === 'High' ? t.priorityHigh : task.priority === 'Medium' ? t.priorityMedium : t.priorityLow}
                          </span>

                          {dates?.deadline && (
                            <span className={`text-[11px] font-medium ${dark ? 'text-violet-400' : 'text-violet-500'}`}>
                              🎯 {fmt(dates.deadline)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusConfig[task.status].color}`}>
                          {statusConfig[task.status].label}
                        </span>
                        {/* chevron accordion */}
                        {!savedDesc ? (
                          <button onClick={() => { toggleExpand(task.id); if (!isExpanded && !isDone) startEdit(task.id) }}
                            className={`${chevronCls} transition`} title="Detalhes">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                          </button>
                        ) : (
                          <button onClick={() => toggleExpand(task.id)}
                            className={`text-[11px] font-medium ${showDescCls} flex items-center gap-0.5 transition`}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                              style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                            {isExpanded ? 'Ocultar' : 'Descrição'}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ── accordion ── */}
                    {isExpanded && (
                      <div className={`mx-5 mb-4 rounded-xl border ${descAreaBg} p-4 flex flex-col gap-4`}>

                        {/* timeline */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            { lbl: 'Criada em',    val: fmt(dates?.created ?? null),  dot: 'bg-slate-400' },
                            { lbl: hasProrrog ? 'Prazo atual' : 'Meta (prazo)', val: fmt(dates?.deadline ?? null), dot: 'bg-violet-500',
                              extra: (
                                <button
                                  onClick={() => {
                                    if (isDone) return
                                    if (dates?.deadline) {
                                      setConfirmDeadlineId(task.id)
                                      setDeadlineChangeStep('ask')
                                    } else {
                                      setEditingDeadlineId(task.id)
                                      setDeadlineDraft(prev => ({ ...prev, [task.id]: '' }))
                                    }
                                  }}
                                  disabled={isDone}
                                  className={`mt-1 flex items-center gap-1 text-[10px] font-medium transition ${isDone ? `${dark ? 'text-white/20' : 'text-slate-300'} cursor-not-allowed` : `${dark ? 'text-violet-400/70 hover:text-violet-300' : 'text-violet-400 hover:text-violet-600'} cursor-pointer`}`}>
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  {dates?.deadline ? 'Alterar' : 'Definir'}
                                </button>
                              )
                            },
                            { lbl: 'Iniciada em',  val: dates?.started  ? fmt(dates.started)  : isPending ? '— (não iniciada)' : '—', dot: 'bg-blue-400' },
                            { lbl: 'Concluída em', val: dates?.finished ? fmt(dates.finished) : '—', dot: 'bg-emerald-500' },
                          ].map(item => (
                            <div key={item.lbl}>
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${item.dot} flex-shrink-0`} />
                                <span className={`text-[10px] font-semibold uppercase tracking-widest ${timelineLbl}`}>{item.lbl}</span>
                              </div>
                              <p className={`text-xs font-medium ${timelineVal} pl-3`}>{item.val}</p>
                              {item.extra && <div className="pl-3">{item.extra}</div>}
                            </div>
                          ))}
                        </div>

                        {/* prazo original — exibido quando houve prorrogação */}
                        {hasProrrog && (
                          <div className={`-mt-1 pt-3 border-t ${dark ? 'border-white/5' : 'border-slate-200'} flex items-center gap-2`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            <span className={`text-[10px] font-semibold uppercase tracking-widest ${timelineLbl}`}>Prazo original:</span>
                            <span className={`text-[11px] font-medium ${dark ? 'text-amber-300' : 'text-amber-600'}`}>{fmt(dates?.originalDeadline ?? null)}</span>
                            <span className={`text-[10px] ${dark ? 'text-white/30' : 'text-slate-400'}`}>(prazo prorrogado)</span>
                          </div>
                        )}

                        {/* definir prazo inline (apenas quando não há prazo) */}
                        {editingDeadlineId === task.id && (
                          <div className={`-mt-1 pt-3 border-t ${dark ? 'border-white/5' : 'border-slate-200'} flex flex-col gap-2`}>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0`} />
                              <span className={`text-[10px] font-semibold uppercase tracking-widest ${timelineLbl}`}>Definir prazo</span>
                            </div>
                            <div className="pl-3 flex items-center gap-2">
                              <input type="date"
                                value={deadlineDraft[task.id] ?? ''}
                                onChange={e => setDeadlineDraft(prev => ({ ...prev, [task.id]: e.target.value }))}
                                className={inputDateCls} autoFocus />
                              <button onClick={() => saveDeadline(task.id)}
                                className="text-[10px] px-2 py-0.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white font-semibold transition">ok</button>
                              <button onClick={() => setEditingDeadlineId(null)}
                                className={`text-[10px] px-1.5 py-0.5 rounded-md border ${dark ? 'border-white/10 text-white/40' : 'border-slate-200 text-slate-400'} transition`}>✕</button>
                            </div>
                          </div>
                        )}

                        {/* histórico de alterações de prazo */}
                        {(deadlineHistory[task.id]?.length ?? 0) > 0 && (
                          <div className={`pt-3 border-t ${dark ? 'border-white/5' : 'border-slate-200'} flex flex-col gap-2`}>
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                              <span className={`text-[10px] font-semibold uppercase tracking-widest ${timelineLbl}`}>Observações — alterações de prazo</span>
                            </div>
                            <div className="pl-3 flex flex-col gap-2">
                              {deadlineHistory[task.id].map((entry, i) => (
                                <div key={i} className={`rounded-lg px-3 py-2 ${dark ? 'bg-amber-500/5 border border-amber-500/15' : 'bg-amber-50 border border-amber-200'}`}>
                                  <p className={`text-[10px] ${dark ? 'text-white/35' : 'text-slate-400'} mb-0.5`}>
                                    Prazo inicial: <span className={`font-semibold ${dark ? 'text-white/55' : 'text-slate-500'}`}>{fmt(entry.oldDate)}</span>
                                  </p>
                                  <p className={`text-[10px] font-semibold ${dark ? 'text-amber-400' : 'text-amber-700'} mb-1`}>
                                    Novo prazo: {fmt(entry.newDate)} <span className={`font-normal ${dark ? 'text-white/30' : 'text-slate-400'}`}>· {entry.changedAt}</span>
                                  </p>
                                  <p className={`text-[11px] ${dark ? 'text-white/60' : 'text-slate-600'}`}>{entry.reason}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* stats de tempo */}
                        <div className={`flex flex-wrap gap-4 text-xs pt-1 border-t ${dark ? 'border-white/5' : 'border-slate-200'}`}>
                          {stalled !== null && (
                            <span className={textFaint}>
                              ⏸ Ficou parada <strong className={text}>{stalled}d</strong> antes de iniciar
                            </span>
                          )}
                          {isRunning && dates?.started && (
                            <span className={textFaint}>
                              ▶ Em andamento há <strong className={text}>{inProg}d</strong>
                            </span>
                          )}
                          {isDone && dates?.started && dates?.finished && (
                            <span className={textFaint}>
                              ✓ Concluída em <strong className={text}>{inProg}d</strong>
                            </span>
                          )}
                          {/* SLA de resolução — baseado no prazo original, imune a prorrogações */}
                          {sla !== null && isDone && (
                            <span className={sla.onTime
                              ? `font-medium ${dark ? 'text-emerald-400' : 'text-emerald-600'}`
                              : `font-medium ${dark ? 'text-red-400' : 'text-red-600'}`}>
                              {sla.onTime
                                ? `SLA: dentro do prazo${sla.days > 0 ? ` (${sla.days}d de antecedência)` : ''}`
                                : `SLA: ${sla.days}d após o prazo original`}
                            </span>
                          )}
                          {isPending && (
                            <span className="text-amber-500 font-medium">Clique no círculo para iniciar a tarefa</span>
                          )}
                        </div>

                        {/* descrição */}
                        <div className={`pt-1 border-t ${dark ? 'border-white/5' : 'border-slate-200'}`}>
                          {isEditing && !isDone ? (
                            <>
                              <textarea rows={3} placeholder="Adicione uma descrição para esta tarefa..."
                                value={draft} onChange={e => setDraftDesc(prev => ({ ...prev, [task.id]: e.target.value }))}
                                className={textareaCls} autoFocus />
                              <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => cancelEdit(task.id)}
                                  className={`text-xs px-3 py-1.5 rounded-lg border ${dark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} transition`}>
                                  Cancelar
                                </button>
                                <button onClick={() => saveDescToBank(task.id)}
                                  className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition">
                                  Salvar
                                </button>
                              </div>
                            </>
                          ) : savedDesc ? (
                            <>
                              <p className={`text-sm leading-relaxed ${descTextCls}`}>{savedDesc}</p>
                              {!isDone && (
                                <button onClick={() => startEdit(task.id)}
                                  className={`mt-2 text-xs font-medium ${editBtnCls} flex items-center gap-1 transition`}>
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                  Editar descrição
                                </button>
                              )}
                            </>
                          ) : !isDone ? (
                            <button onClick={() => startEdit(task.id)}
                              className={`text-xs font-medium ${editBtnCls} flex items-center gap-1 transition`}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              Adicionar descrição
                            </button>
                          ) : (
                            <p className={`text-xs italic ${dark ? 'text-white/25' : 'text-slate-300'}`}>Sem descrição</p>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            {/* paginação */}
            {filtered.length > pageSize && (
              <div className={`flex items-center justify-between px-5 py-3 border-t ${listBdr}`}>
                <span className={`text-xs ${textFaint}`}>
                  {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} de {filtered.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                    className={`${pagBtnBase} ${safePage === 1 ? pagBtnInact + ' opacity-40 cursor-not-allowed' : pagBtnInact}`}>
                    ‹
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setPage(n)}
                      className={`${pagBtnBase} ${n === safePage ? pagBtnActive : pagBtnInact}`}>
                      {n}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                    className={`${pagBtnBase} ${safePage === totalPages ? pagBtnInact + ' opacity-40 cursor-not-allowed' : pagBtnInact}`}>
                    ›
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Gráfico de acompanhamento ── */}
          <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
            {/* cabeçalho */}
            <div className={`px-5 pt-4 pb-3 border-b ${dark ? 'border-white/5' : 'border-slate-100'}`}>
              {/* linha 1: título + legenda */}
              <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                <div>
                  <p className={`text-sm font-semibold ${text}`}>Progresso das Tarefas</p>
                  <p className={`text-xs ${textFaint} mt-0.5`}>Concluídas vs. previsto ao longo do tempo</p>
                </div>
                <div className="flex items-center gap-5">
                  {[
                    { color: '#10b981', label: 'Concluídas', dash: false },
                    { color: '#6366f1', label: 'Em andamento', dash: false },
                    { color: dark ? 'rgba(255,255,255,.35)' : 'rgba(100,116,139,.55)', label: 'Previsto', dash: true },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <svg width="22" height="8" className="flex-shrink-0">
                        {l.dash
                          ? <line x1="0" y1="4" x2="22" y2="4" stroke={l.color} strokeWidth="1.5" strokeDasharray="4 2.5" />
                          : <line x1="0" y1="4" x2="22" y2="4" stroke={l.color} strokeWidth="2" strokeLinecap="round" />}
                      </svg>
                      <span className={`text-[11px] font-medium ${textFaint}`}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* linha 2: navegação semana + filtro mês */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <button onClick={prevWeek} aria-label="Semana anterior"
                    className={`w-6 h-6 flex items-center justify-center rounded-lg border ${dark ? 'border-white/10 text-white/45 hover:bg-white/8 hover:text-white/75' : 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700'} transition`}>
                    <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <span aria-live="polite" aria-atomic="true" className={`text-xs font-semibold ${text} min-w-[180px] text-center`}>{weekLabel}</span>
                  <button onClick={nextWeek} aria-label="Próxima semana"
                    className={`w-6 h-6 flex items-center justify-center rounded-lg border ${dark ? 'border-white/10 text-white/45 hover:bg-white/8 hover:text-white/75' : 'border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-slate-700'} transition`}>
                    <svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={chartMonth.month}
                    onChange={e => { setChartMonth(prev => ({ ...prev, month: Number(e.target.value) })); setChartWeek(1) }}
                    style={{ backgroundColor: dark ? '#0D1117' : undefined }}
                    className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer ${dark ? 'border-white/10 text-white/65' : 'bg-white border-slate-200 text-slate-600'} transition`}>
                    {monthNames.map((name, i) => (
                      <option key={i} value={i} style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>{name}</option>
                    ))}
                  </select>
                  <select
                    value={chartMonth.year}
                    onChange={e => { setChartMonth(prev => ({ ...prev, year: Number(e.target.value) })); setChartWeek(1) }}
                    style={{ backgroundColor: dark ? '#0D1117' : undefined }}
                    className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer ${dark ? 'border-white/10 text-white/65' : 'bg-white border-slate-200 text-slate-600'} transition`}>
                    {availableYears.map(y => (
                      <option key={y} value={y} style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Tabela de dados oculta visualmente — acessível para leitores de tela */}
            <div className="sr-only">
              <table>
                <caption suppressHydrationWarning>Progresso semanal — {weekLabel}</caption>
                <thead>
                  <tr><th scope="col">Data</th><th scope="col">Previsto</th><th scope="col">Concluídas</th><th scope="col">Em andamento</th></tr>
                </thead>
                <tbody>
                  {chartLabels.map((lbl, i) => (
                    <tr key={i}>
                      <th scope="row">{lbl}</th>
                      <td>{plannedSeries[i]}</td>
                      <td>{doneSeries[i]}</td>
                      <td>{progressSeries[i]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-5 pt-5 pb-4">
              <svg
                width="100%"
                viewBox={`0 0 ${GW} ${GH + 40}`}
                className="overflow-visible"
                role="img"
                aria-labelledby="chart-title chart-desc"
                onMouseLeave={() => setChartHoverIdx(null)}
              >
                <title id="chart-title" suppressHydrationWarning>Gráfico de progresso — {weekLabel}</title>
                <desc id="chart-desc" suppressHydrationWarning>
                  Linha de tarefas concluídas, em andamento e previsto por dia da semana.
                  {doneSeries[doneSeries.length - 1]} concluídas e {progressSeries[progressSeries.length - 1]} em andamento no último dia visível.
                </desc>
                <defs>
                  <linearGradient id="gDone" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="gProgress" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="gDev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.13" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* linhas de grade horizontais + labels eixo Y */}
                {[0, 0.25, 0.5, 0.75, 1].map((f, idx) => {
                  const val = Math.round(f * gMax)
                  const yg  = gy(Math.max(1, val === 0 ? 1 : val))
                  return (
                    <g key={idx}>
                      <line x1={GP} y1={yg} x2={GW - GP / 2} y2={yg}
                        stroke={dark ? 'rgba(255,255,255,.055)' : 'rgba(0,0,0,.06)'} strokeWidth="1" />
                      <text x={GP - 8} y={yg + 4} textAnchor="end"
                        fontSize="10" fontFamily="system-ui,sans-serif" fontWeight="500"
                        fill={dark ? 'rgba(255,255,255,.28)' : '#94a3b8'}>{val}</text>
                    </g>
                  )
                })}

                {/* linhas de grade verticais em cada ponto */}
                {chartLabels.map((_, i) => (
                  <line key={i} x1={gx(i)} y1={GP} x2={gx(i)} y2={GH - GP}
                    stroke={dark ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.04)'} strokeWidth="1" />
                ))}

                {/* crosshair de hover */}
                {chartHoverIdx !== null && (
                  <line x1={gx(chartHoverIdx)} y1={GP - 4} x2={gx(chartHoverIdx)} y2={GH - GP}
                    stroke={dark ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.13)'}
                    strokeWidth="1" strokeDasharray="3 2" />
                )}

                {/* baseline */}
                <line x1={GP} y1={GH - GP} x2={GW - GP / 2} y2={GH - GP}
                  stroke={dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.1)'} strokeWidth="1" />

                {/* área de desvio */}
                <path d={areaDeviation} fill="url(#gDev)" />

                {/* área sob concluídas */}
                <path d={`${pathDone} L ${gx(nPoints-1)} ${GH - GP} L ${gx(0)} ${GH - GP} Z`} fill="url(#gDone)" />

                {/* área sob andamento */}
                <path d={`${pathProgress} L ${gx(nPoints-1)} ${GH - GP} L ${gx(0)} ${GH - GP} Z`} fill="url(#gProgress)" />

                {/* linha previsto (tracejada) */}
                <path d={pathPlanned} fill="none"
                  stroke={dark ? 'rgba(255,255,255,.28)' : 'rgba(100,116,139,.4)'}
                  strokeWidth="1.5" strokeDasharray="6 3" strokeLinecap="round" />

                {/* linha andamento */}
                <path d={pathProgress} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

                {/* linha concluídas */}
                <path d={pathDone} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* pontos concluídas */}
                {doneSeries.map((v, i) => {
                  const cy = v > 0 ? gy(v) : GH - GP
                  return (
                    <g key={i}>
                      <circle cx={gx(i)} cy={cy} r="8" fill="#10b981" opacity={chartHoverIdx === i ? 0.2 : 0.1} />
                      <circle cx={gx(i)} cy={cy} r="3.5" fill="#10b981" />
                      <circle cx={gx(i)} cy={cy} r="1.4" fill="white" opacity="0.85" />
                    </g>
                  )
                })}

                {/* pontos andamento */}
                {progressSeries.map((v, i) => {
                  const cy = v > 0 ? gy(v) : GH - GP
                  return (
                    <g key={i}>
                      <circle cx={gx(i)} cy={cy} r="6.5" fill="#6366f1" opacity={chartHoverIdx === i ? 0.2 : 0.1} />
                      <circle cx={gx(i)} cy={cy} r="3" fill="#6366f1" />
                      <circle cx={gx(i)} cy={cy} r="1.2" fill="white" opacity="0.85" />
                    </g>
                  )
                })}

                {/* hit targets + labels eixo X */}
                {chartLabels.map((lbl, i) => {
                  const colW = nPoints > 1 ? (GW - GP * 2) / (nPoints - 1) : GW - GP * 2
                  return (
                    <g key={i}>
                      <rect
                        x={gx(i) - colW / 2} y={GP}
                        width={colW} height={GH - GP * 2}
                        fill="transparent"
                        onMouseEnter={() => setChartHoverIdx(i)} />
                      <text x={gx(i)} y={GH + 17} textAnchor="middle"
                        fontSize="10" fontFamily="system-ui,sans-serif"
                        fontWeight={chartHoverIdx === i ? '600' : '400'}
                        fill={chartHoverIdx === i
                          ? (dark ? 'rgba(255,255,255,.7)' : '#475569')
                          : (dark ? 'rgba(255,255,255,.32)' : '#94a3b8')}>
                        {lbl}
                      </text>
                    </g>
                  )
                })}

                {/* tooltip */}
                {chartHoverIdx !== null && (() => {
                  const i = chartHoverIdx
                  const tx = gx(i)
                  const tw = 118; const th = 68
                  const tx2 = tx + tw > GW - GP / 2 ? tx - tw - 10 : tx + 10
                  const ty2 = GP
                  const bg  = dark ? '#1a2030' : '#f8fafc'
                  const bd  = dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.08)'
                  const lbl1 = dark ? 'rgba(255,255,255,.4)' : '#64748b'
                  const lbl2 = dark ? 'rgba(255,255,255,.75)' : '#1e293b'
                  return (
                    <g style={{ pointerEvents: 'none' }}>
                      <rect x={tx2} y={ty2} width={tw} height={th} rx="7"
                        fill={bg} stroke={bd} strokeWidth="1" />
                      <text x={tx2 + 10} y={ty2 + 14} fontSize="9.5"
                        fontFamily="system-ui,sans-serif" fontWeight="600" fill={lbl1}>
                        {chartLabels[i]}
                      </text>
                      <circle cx={tx2 + 11} cy={ty2 + 29} r="3.5" fill="#10b981" />
                      <text x={tx2 + 20} y={ty2 + 33} fontSize="10"
                        fontFamily="system-ui,sans-serif" fontWeight="500" fill={lbl2}>
                        Concluídas: {doneSeries[i]}
                      </text>
                      <circle cx={tx2 + 11} cy={ty2 + 48} r="3.5" fill="#6366f1" />
                      <text x={tx2 + 20} y={ty2 + 52} fontSize="10"
                        fontFamily="system-ui,sans-serif" fontWeight="500" fill={lbl2}>
                        Andamento: {progressSeries[i]}
                      </text>
                    </g>
                  )
                })()}
              </svg>

              {/* insight */}
              <div className={`mt-1 pt-3 border-t ${dark ? 'border-white/5' : 'border-slate-100'}`}>
                {(() => {
                  const lastDone    = doneSeries[doneSeries.length - 1]
                  const lastPlanned = plannedSeries[plannedSeries.length - 1]
                  const diff = lastDone - lastPlanned
                  if (diff >= 0) return (
                    <div className="flex items-center gap-2.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${dark ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Adiantado
                      </span>
                      <span className={`text-xs ${textFaint}`}>{diff} tarefa{diff !== 1 ? 's' : ''} acima do previsto</span>
                    </div>
                  )
                  return (
                    <div className="flex items-center gap-2.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${dark ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                        Abaixo do previsto
                      </span>
                      <span className={`text-xs ${textFaint}`}>{Math.abs(diff)} tarefa{Math.abs(diff) !== 1 ? 's' : ''} abaixo do esperado</span>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>

          {/* ── Analytics FastAPI ── */}
          {analytics?.status && (
            <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
              <div className={`px-5 pt-4 pb-3 border-b ${dark ? 'border-white/5' : 'border-slate-100'}`}>
                <p className={`text-sm font-semibold ${text}`}>Analytics</p>
                <p className={`text-xs ${textFaint} mt-0.5`}>Métricas geradas pela FastAPI</p>
              </div>

              <div className="px-5 py-5 space-y-6">

                {/* Status */}
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${textFaint} mb-3`}>Por Status</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Total',     value: analytics.status.data.total_tasks,      accent: 'text-violet-500' },
                      { label: 'Pendente',  value: analytics.status.data.PENDING.count,    accent: dark ? 'text-white/55' : 'text-slate-500', sub: `${analytics.status.data.PENDING.percent}%` },
                      { label: 'Andamento', value: analytics.status.data.IN_PROGRESS.count, accent: 'text-blue-400', sub: `${analytics.status.data.IN_PROGRESS.percent}%` },
                      { label: 'Concluída', value: analytics.status.data.DONE.count,       accent: 'text-emerald-400', sub: `${analytics.status.data.DONE.percent}%` },
                    ].map(s => (
                      <div key={s.label} className={`${dark ? 'bg-white/[0.03] border-white/8' : 'bg-slate-50 border-slate-200'} border rounded-xl px-4 py-3`}>
                        <p className={`text-[10px] font-semibold ${textFaint} uppercase tracking-widest`}>{s.label}</p>
                        <p className={`text-xl font-black ${s.accent} leading-tight mt-1`}>{s.value}</p>
                        {s.sub && <p className={`text-[10px] ${textFaint} mt-0.5`}>{s.sub}</p>}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prioridade */}
                {analytics.priority && (
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${textFaint} mb-3`}>Por Prioridade</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Alta',  value: analytics.priority.data.HIGH.count,   sub: `${analytics.priority.data.HIGH.percent}%`,   accent: 'text-red-400'     },
                        { label: 'Média', value: analytics.priority.data.MEDIUM.count, sub: `${analytics.priority.data.MEDIUM.percent}%`, accent: 'text-amber-400'   },
                        { label: 'Baixa', value: analytics.priority.data.LOW.count,    sub: `${analytics.priority.data.LOW.percent}%`,    accent: 'text-emerald-400' },
                      ].map(s => (
                        <div key={s.label} className={`${dark ? 'bg-white/[0.03] border-white/8' : 'bg-slate-50 border-slate-200'} border rounded-xl px-4 py-3`}>
                          <p className={`text-[10px] font-semibold ${textFaint} uppercase tracking-widest`}>{s.label}</p>
                          <p className={`text-xl font-black ${s.accent} leading-tight mt-1`}>{s.value}</p>
                          <p className={`text-[10px] ${textFaint} mt-0.5`}>{s.sub}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tempo médio */}
                {analytics.averageTime && (
                  <div>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${textFaint} mb-3`}>Tempo Médio de Conclusão</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Horas', value: analytics.averageTime.data.average_time_hours.toFixed(1) },
                        { label: 'Dias',  value: analytics.averageTime.data.average_time_days.toFixed(1)  },
                      ].map(s => (
                        <div key={s.label} className={`${dark ? 'bg-white/[0.03] border-white/8' : 'bg-slate-50 border-slate-200'} border rounded-xl px-4 py-3`}>
                          <p className={`text-[10px] font-semibold ${textFaint} uppercase tracking-widest`}>{s.label}</p>
                          <p className={`text-xl font-black ${text} leading-tight mt-1`}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Throughput */}
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${textFaint} mb-3`}>Throughput — Tarefas por Dia</p>
                  {analytics.throughput?.data.length ? (
                    <div className={`${dark ? 'bg-white/[0.03] border-white/8' : 'bg-slate-50 border-slate-200'} border rounded-xl p-4`}>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={analytics.throughput.data}>
                          <CartesianGrid stroke={dark ? 'rgba(255,255,255,.06)' : '#e2e8f0'} />
                          <XAxis dataKey="day" stroke={dark ? 'rgba(255,255,255,.3)' : '#94a3b8'} tick={{ fontSize: 11, fill: dark ? 'rgba(255,255,255,.4)' : '#64748b' }} />
                          <YAxis stroke={dark ? 'rgba(255,255,255,.3)' : '#94a3b8'} tick={{ fontSize: 11, fill: dark ? 'rgba(255,255,255,.4)' : '#64748b' }} />
                          <Tooltip contentStyle={{ backgroundColor: dark ? '#1a2030' : '#fff', border: `1px solid ${dark ? 'rgba(255,255,255,.1)' : '#e2e8f0'}`, borderRadius: '8px', color: dark ? '#fff' : '#1e293b', fontSize: 12 }} />
                          <Line type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 3 }} name="Concluídas" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className={`${dark ? 'border-white/8 text-white/25' : 'border-slate-200 text-slate-400'} border border-dashed rounded-xl px-4 py-3 text-xs`}>Dados insuficientes</div>
                  )}
                </div>

                {/* Backlog */}
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${textFaint} mb-3`}>Evolução do Backlog</p>
                  {analytics.backlog?.data.length ? (
                    <div className={`${dark ? 'bg-white/[0.03] border-white/8' : 'bg-slate-50 border-slate-200'} border rounded-xl p-4`}>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={analytics.backlog.data}>
                          <CartesianGrid stroke={dark ? 'rgba(255,255,255,.06)' : '#e2e8f0'} />
                          <XAxis dataKey="date" stroke={dark ? 'rgba(255,255,255,.3)' : '#94a3b8'} tick={{ fontSize: 11, fill: dark ? 'rgba(255,255,255,.4)' : '#64748b' }} />
                          <YAxis stroke={dark ? 'rgba(255,255,255,.3)' : '#94a3b8'} tick={{ fontSize: 11, fill: dark ? 'rgba(255,255,255,.4)' : '#64748b' }} />
                          <Tooltip contentStyle={{ backgroundColor: dark ? '#1a2030' : '#fff', border: `1px solid ${dark ? 'rgba(255,255,255,.1)' : '#e2e8f0'}`, borderRadius: '8px', color: dark ? '#fff' : '#1e293b', fontSize: 12 }} />
                          <Bar dataKey="criadas"    fill="#6366f1" name="Criadas"    radius={[3,3,0,0]} />
                          <Bar dataKey="finalizadas" fill="#10b981" name="Finalizadas" radius={[3,3,0,0]} />
                          <Bar dataKey="backlog"    fill="#ef4444" name="Backlog"    radius={[3,3,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className={`${dark ? 'border-white/8 text-white/25' : 'border-slate-200 text-slate-400'} border border-dashed rounded-xl px-4 py-3 text-xs`}>Dados insuficientes</div>
                  )}
                </div>

                {/* Response Time */}
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${textFaint} mb-3`}>SLA de Tempo de Resposta</p>
                  {analytics.responseTime?.data.length ? (
                    <div className={`${dark ? 'bg-white/[0.03] border-white/8' : 'bg-slate-50 border-slate-200'} border rounded-xl p-4`}>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={analytics.responseTime.data}>
                          <CartesianGrid stroke={dark ? 'rgba(255,255,255,.06)' : '#e2e8f0'} />
                          <XAxis dataKey="date" stroke={dark ? 'rgba(255,255,255,.3)' : '#94a3b8'} tick={{ fontSize: 11, fill: dark ? 'rgba(255,255,255,.4)' : '#64748b' }} />
                          <YAxis stroke={dark ? 'rgba(255,255,255,.3)' : '#94a3b8'} tick={{ fontSize: 11, fill: dark ? 'rgba(255,255,255,.4)' : '#64748b' }} unit="%" />
                          <Tooltip contentStyle={{ backgroundColor: dark ? '#1a2030' : '#fff', border: `1px solid ${dark ? 'rgba(255,255,255,.1)' : '#e2e8f0'}`, borderRadius: '8px', color: dark ? '#fff' : '#1e293b', fontSize: 12 }} formatter={(v) => typeof v === 'number' ? `${v}%` : ''} />
                          <Line type="monotone" dataKey="slaPercentage" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="SLA %" />
                          <Line type="monotone" dataKey="target" stroke={dark ? 'rgba(255,255,255,.3)' : '#94a3b8'} strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Meta" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className={`${dark ? 'border-white/8 text-white/25' : 'border-slate-200 text-slate-400'} border border-dashed rounded-xl px-4 py-3 text-xs`}>Dados insuficientes</div>
                  )}
                </div>

              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
