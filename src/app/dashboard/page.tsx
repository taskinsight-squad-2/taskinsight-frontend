'use client'

import React, { useState, useMemo, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { translations, type Locale } from '@/lib/i18n'
import { taskService } from '@/services/task.service'
import { analyticsApi } from '@/services/analytics.service'
import type { Task as ApiTask } from '@/types/task'
import { useA11yPrefs } from '@/hooks/useA11yPrefs'
import type { Priority, Status, FilterTab, AnalyticsResult, TaskDates } from '@/types/dashboard'
import { mapStatus, mapPriority, today, fmt } from '@/lib/dashboard-utils'
import { speak } from '@/lib/speak'
import { useSpeechReader } from '@/hooks/useSpeechReader'
import { useDashboardTheme } from '@/hooks/useDashboardTheme'
import { NewTaskModal } from '@/components/dashboard/NewTaskModal'
import { DeadlineModal } from '@/components/dashboard/DeadlineModal'
import { ConfirmStartModal } from '@/components/dashboard/ConfirmStartModal'
import { PersonalizeModal } from '@/components/dashboard/PersonalizeModal'
import { CancelTaskModal } from '@/components/dashboard/CancelTaskModal'
import { TaskItem } from '@/components/dashboard/TaskItem'
import { Analytics } from '@/components/dashboard/Analytics'

function DashboardPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const isNew        = searchParams.get('new') === 'true'
  const [locale, setLocale] = useState<Locale>(() =>
    typeof window !== 'undefined' ? (localStorage.getItem('locale') as Locale | null ?? 'pt') : 'pt'
  )
  useEffect(() => { localStorage.setItem('locale', locale) }, [locale])
  const t = translations[locale]
  const { prefs, set: setPrefs }      = useA11yPrefs()
  const dark                          = prefs.darkMode
  useSpeechReader(prefs.speechMode)

  const [isAuthChecked, setIsAuthChecked] = useState(false)
  useEffect(() => {
    const stored = localStorage.getItem('token')
    if (!stored) { router.replace('/login'); return }
    setIsAuthChecked(true)
  }, [])

  const [isClient, setIsClient] = useState(false)
  useEffect(() => setIsClient(true), [])

  const [userName, setUserName] = useState('')
  const [userInitials, setUserInitials] = useState('U')
  const [userRole, setUserRole] = useState<'user' | 'admin'>('user')
  const [greeting, setGreeting] = useState('')
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const u = JSON.parse(stored)
        setUserName(u.name?.split(' ')[0] ?? '')
        setUserRole(u.role ?? 'user')
        const parts = (u.name ?? '').trim().split(/\s+/).filter(Boolean)
        setUserInitials(
          parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : (parts[0]?.slice(0, 2) ?? 'U').toUpperCase()
        )
      }
    } catch {}
    setGreeting(t.greeting(new Date().getHours()))
  }, [t])
  const [filter, setFilter] = useState<FilterTab>('All')

  const [pageSize, setPageSize]       = useState(5)
  const [page, setPage]               = useState(1)

  // ── API tasks ────────────────────────────────────────────────────
  const [apiTasks, setApiTasks] = useState<ApiTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(true)



  const fetchTasks = useCallback(async () => {
    const token = localStorage.getItem('token') ?? undefined
    if (!token) return
    try {
      const data = await taskService.getAll(token)
      const sorted = Array.isArray(data)
        ? [...data].sort((a, b) => {
            const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return tB - tA
          })
        : []
      setApiTasks(sorted)
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
      const [priority, averageTime, throughput, responseTime, resolutionTime, responseTimeMonthly, resolutionTimeMonthly] = await Promise.all([
        analyticsApi.getByPriority(tok),
        analyticsApi.getAverageTime(tok),
        analyticsApi.getThroughput(tok),
        analyticsApi.getResponseTime(tok),
        analyticsApi.getResolutionTime(tok).catch(() => null),
        analyticsApi.getResponseTimeMonthly(tok).catch(() => null),
        analyticsApi.getResolutionTimeMonthly(tok).catch(() => null),
      ])
      // normalise resolution-time: detecta o campo percentual independente do nome retornado pela FastAPI
      const normalizedResolution = resolutionTime ? {
        ...resolutionTime,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        data: resolutionTime.data.map((item: any) => {
          const CANDIDATE_FIELDS = [
            'slaPercentage', 'resolutionPercentage', 'resolution_percentage',
            'completion_rate', 'completionRate', 'completionPercentage', 'completion_percentage',
            'percentage', 'sla_percentage', 'slaResolutionPercentage', 'sla_resolution_percentage',
            'onTimePercentage', 'on_time_percentage', 'on_time_rate', 'onTimeRate',
            'withinDeadlinePercentage', 'within_deadline_percentage',
            'completedOnTimePercentage', 'completed_on_time_percentage',
            'taskCompletionRate', 'task_completion_rate',
            'slaCompliance', 'sla_compliance', 'resolutionRate', 'resolution_rate',
          ]
          let slaPercentage: number | undefined
          for (const f of CANDIDATE_FIELDS) {
            if (typeof item[f] === 'number') { slaPercentage = item[f]; break }
          }
          // fallback final: qualquer campo numérico > 0 e ≤ 100 exceto target/date
          if (slaPercentage === undefined) {
            for (const [k, v] of Object.entries(item)) {
              if (typeof v === 'number' && v > 0 && v <= 100 && k !== 'target' && !k.toLowerCase().includes('date')) {
                slaPercentage = v; break
              }
            }
          }
          return { date: item.date ?? '', slaPercentage: slaPercentage ?? 0, target: item.target ?? 90 }
        }),
      } : null
      setAnalytics({ status, priority, averageTime, throughput, backlog, responseTime, resolutionTime: normalizedResolution, responseTimeMonthly, resolutionTimeMonthly })
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

  function showToast(msg: string) {
    setToastMsg(msg)
    if (prefs.speechMode) speak(msg.replace(/^[✓⚠]\s*/, ''))
    setTimeout(() => setToastMsg(''), 3000)
  }

const token = typeof window !== 'undefined' ? localStorage.getItem('token') ?? undefined : undefined

  const [confirmStartId, setConfirmStartId] = useState<string | null>(null)

  async function confirmStart(id: string) {
    setConfirmStartId(null)
    const now = new Date().toISOString()
    setTaskDates(prev => ({ ...prev, [id]: { ...prev[id], started: now.slice(0, 10) } }))
    await taskService.update(id, { status: 'IN_PROGRESS', startedAt: now }, token).catch(() => {})
    await fetchTasks()
    if (prefs.speechMode) speak('Tarefa iniciada')
  }
  async function finishTask(id: string) {
    const dates = taskDates[id]
    if (!dates?.deadline) { showToast('⚠ Defina um prazo antes de concluir a tarefa.'); return }
    const now = new Date().toISOString()
    setTaskStatuses(prev => ({ ...prev, [id]: 'Done' }))
    setTaskDates(prev => ({ ...prev, [id]: { ...prev[id], finished: today() } }))
    await taskService.update(id, { status: 'DONE', completedAt: now }, token).catch(() => {})
    await fetchTasks()
    if (prefs.speechMode) speak('Tarefa concluída')
  }
  async function reopenTask(id: string) {
    setTaskStatuses(prev => ({ ...prev, [id]: 'InProgress' }))
    setTaskDates(prev => ({ ...prev, [id]: { ...prev[id], finished: null } }))
    await taskService.update(id, { status: 'IN_PROGRESS' }, token).catch(() => {})
    await fetchTasks()
    if (prefs.speechMode) speak('Tarefa reaberta')
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
    await fetchTasks()
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
    await fetchTasks()
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

  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  async function confirmCancel() {
    if (!confirmCancelId || !cancelReason.trim()) return
    const id = confirmCancelId
    setConfirmCancelId(null)
    setCancelReason('')
    setTaskStatuses(prev => ({ ...prev, [id]: 'Cancelled' }))
    await taskService.update(id, { status: 'CANCELLED' }, token).catch(() => {})
    await fetchTasks()
    showToast('✓ Tarefa cancelada.')
  }
  async function deleteTask(id: string) {
    if (!window.confirm('Excluir esta tarefa permanentemente? Esta ação não pode ser desfeita.')) return
    await taskService.remove(id, token).catch(() => {})
    await fetchTasks()
    showToast('✓ Tarefa excluída.')
  }

  async function saveDescToBank(id: string) {
    const val = draftDesc[id] ?? ''
    setDescriptions(prev => ({ ...prev, [id]: val }))
    setEditing(prev => ({ ...prev, [id]: false }))
    await taskService.update(id, { description: val }, token).catch(() => {})
  }

  // ── criar tarefa ─────────────────────────────────────────────────
  const [showPersonalizeModal, setShowPersonalizeModal] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [newTaskForm, setNewTaskForm] = useState({ title: '', description: '', priority: 'MEDIUM' as ApiTask['priority'], deadline: '' })
  const [savingTask, setSavingTask]   = useState(false)

  const trapNewTask  = useFocusTrap(showNewTask)
  const trapDeadline = useFocusTrap(!!confirmDeadlineId)
  const trapStart    = useFocusTrap(!!confirmStartId)

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault()
    if (!newTaskForm.title.trim() || !newTaskForm.deadline) return
    if (!newTaskForm.description.trim()) { showToast('⚠ A descrição é obrigatória.'); return }
    const titleLower = newTaskForm.title.trim().toLowerCase()
    if (tasks.some(t => t.title?.toLowerCase() === titleLower)) {
      showToast('⚠ Você já possui uma tarefa com esse título.'); return
    }
    setSavingTask(true)
    try {
      await taskService.create({ title: newTaskForm.title, description: newTaskForm.description.trim(), priority: newTaskForm.priority, dueDate: newTaskForm.deadline }, token)
      setNewTaskForm({ title: '', description: '', priority: 'MEDIUM', deadline: '' })
      setShowNewTask(false)
      await fetchTasks()
      loadAnalytics()
      showToast('✓ Tarefa criada com sucesso!')
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      showToast(`⚠ ${msg && msg.length < 120 ? msg : 'Erro ao criar tarefa.'}`)
    }
    finally { setSavingTask(false) }
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  async function completeAll() {
    const tk = typeof window !== 'undefined' ? localStorage.getItem('token') ?? undefined : undefined
    const pending = apiTasks.filter(t => t.status !== 'DONE' && t.status !== 'CANCELLED')
    setTaskStatuses(prev => {
      const next = { ...prev }
      pending.forEach(t => { next[t._id] = 'Done' })
      return next
    })
    await Promise.all(pending.map(t => taskService.update(t._id, { status: 'DONE' }, tk).catch(() => {})))
    await fetchTasks()
  }
  function clearDone() {
    setTaskStatuses(prev => Object.fromEntries(Object.entries(prev).filter(([, v]) => v !== 'Done')))
  }

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

  const nOverdue    = useMemo(() => tasks.filter(t =>
    (t.status === 'Pending' || t.status === 'InProgress') &&
    taskDates[t.id]?.deadline && taskDates[t.id].deadline! < today()
  ).length, [tasks, taskDates])
  const nCancelled  = tasks.filter(t => t.status === 'Cancelled').length

  const filtered = useMemo(() => {
    let list = filter === 'Overdue'
      ? tasks.filter(t => (t.status === 'Pending' || t.status === 'InProgress') && taskDates[t.id]?.deadline && taskDates[t.id].deadline! < today())
      : filter === 'All' ? tasks.filter(t => t.status !== 'Cancelled')
      : tasks.filter(t => t.status === filter)
    if (priorityFilter !== 'All') list = list.filter(t => t.priority === priorityFilter)
    return list
  }, [filter, tasks, taskDates, priorityFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // reset page on filter/pageSize change
  function setFilterReset(f: FilterTab) { setFilter(f); setPage(1) }
  function setPageSizeReset(n: number)  { setPageSize(n); setPage(1) }

  // ── tokens por tema ───────────────────────────────────────────────
  const theme = useDashboardTheme(dark)
  const {
    pageBg, headerBg, headerBdr, text, textMuted, textFaint,
    ctrlBg, cardBg, progressBg, filterBg, filterInact, listBdr,
    emptyIcon, pagBtnBase, pagBtnActive, pagBtnInact,
  } = theme

  const filterTabs: { key: FilterTab; label: string; badge?: number }[] = [
    { key: 'All',        label: t.all },
    { key: 'Pending',    label: t.statusPending },
    { key: 'InProgress', label: t.sInProgress },
    { key: 'Done',       label: t.statusDone },
    { key: 'Overdue',    label: t.sOverdue, badge: nOverdue },
    { key: 'Cancelled',  label: t.cancelledFilter, badge: nCancelled > 0 ? nCancelled : undefined },
  ]

  if (!isAuthChecked) return null

  return (
    <div className={`min-h-screen flex flex-col ${pageBg} ${text} transition-colors duration-300`}>

      {/* modal personalizar experiência */}
      {showPersonalizeModal && (
        <PersonalizeModal onClose={() => setShowPersonalizeModal(false)} locale={locale} dark={dark} />
      )}

      {/* modal nova tarefa */}
      {showNewTask && (
        <NewTaskModal
          dark={dark}
          locale={locale}
          trapRef={trapNewTask}
          form={newTaskForm}
          setForm={setNewTaskForm}
          saving={savingTask}
          onSubmit={handleCreateTask}
          onClose={() => setShowNewTask(false)}
        />
      )}

      {/* modal alterar prazo — 2 etapas */}
      {confirmDeadlineId && (
        <DeadlineModal
          dark={dark}
          trapRef={trapDeadline}
          taskTitle={tasks.find(t => t.id === confirmDeadlineId)?.title ?? ''}
          oldDate={fmt(taskDates[confirmDeadlineId]?.deadline ?? null)}
          deadlineDraft={deadlineDraft[confirmDeadlineId] ?? ''}
          setDeadlineDraft={(val) => setDeadlineDraft(prev => ({ ...prev, [confirmDeadlineId]: val }))}
          deadlineChangeReason={deadlineChangeReason}
          setDeadlineChangeReason={setDeadlineChangeReason}
          step={deadlineChangeStep}
          setStep={setDeadlineChangeStep}
          onConfirm={() => confirmDeadlineChange(confirmDeadlineId)}
          onClose={() => { setConfirmDeadlineId(null); setDeadlineChangeStep(null); setDeadlineChangeReason(''); setDeadlineDraft(prev => ({ ...prev, [confirmDeadlineId]: '' })) }}
        />
      )}

      {/* modal cancelar tarefa */}
      {confirmCancelId && (
        <CancelTaskModal
          dark={dark}
          locale={locale}
          taskTitle={tasks.find(t => t.id === confirmCancelId)?.title ?? ''}
          reason={cancelReason}
          setReason={setCancelReason}
          onConfirm={confirmCancel}
          onClose={() => { setConfirmCancelId(null); setCancelReason('') }}
        />
      )}

      {/* modal confirmar início */}
      {confirmStartId && (() => {
        const task = tasks.find(t => t.id === confirmStartId)!
        return (
          <ConfirmStartModal
            dark={dark}
            trapRef={trapStart}
            task={task}
            priorityLabels={{ High: t.priorityHigh, Medium: t.priorityMedium, Low: t.priorityLow }}
            onConfirm={() => confirmStart(confirmStartId)}
            onClose={() => setConfirmStartId(null)}
          />
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

      <main
        id="main-content"
        className="flex-1 flex flex-col min-h-screen overflow-auto"
        tabIndex={-1}
      >

        {/* Header */}
        <div className={`relative border-b ${headerBdr} ${headerBg} sticky top-0 z-30 transition-colors duration-300`}>
          <div className="absolute inset-0 backdrop-blur-xl pointer-events-none" />

          {/* Row 1: greeting + ações primárias */}
          <div className="relative flex items-center justify-between px-3 py-3 sm:px-6 sm:py-4 gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="min-w-0">
                <h1 className={`text-sm sm:text-base font-bold ${text} tracking-tight truncate`}>{greeting}{userName ? `, ${userName}` : ''} 👋</h1>
                <p className="text-xs text-violet-500 mt-0.5 truncate">{t.pendingTasksMsg(nPending)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* desktop: Personalizar */}
              <button
                onClick={() => setShowPersonalizeModal(true)}
                aria-label={t.personalizeBtn}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${ctrlBg} hover:opacity-80 transition text-xs font-semibold`}>
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
                  <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
                  <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
                </svg>
                <span>{t.personalizeBtn}</span>
              </button>
              {/* desktop: PT-BR select */}
              <select value={locale} onChange={e => setLocale(e.target.value as Locale)}
                style={{ backgroundColor: dark ? '#0D1117' : undefined }}
                className={`text-xs font-semibold px-2 py-1.5 rounded-lg border ${ctrlBg} outline-none cursor-pointer hover:opacity-80 transition hidden sm:block`}>
                <option style={{ backgroundColor: dark ? '#0D1117' : 'white' }} value="pt">PT-BR</option>
                <option style={{ backgroundColor: dark ? '#0D1117' : 'white' }} value="en">EN</option>
              </select>
              {/* sempre: dark mode */}
              <button onClick={() => setPrefs('darkMode', !dark)}
                aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
                className={`w-8 h-8 flex items-center justify-center rounded-lg border ${ctrlBg} hover:opacity-80 transition text-sm`}>
                <span aria-hidden="true">{dark ? '☀️' : '🌙'}</span>
              </button>
              {/* desktop: Admin */}
              {userRole === 'admin' && (
                <button
                  onClick={() => router.push('/dashboard/admin')}
                  aria-label="Acessar painel administrativo"
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-semibold hover:bg-violet-500/20 transition">
                  <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Admin
                </button>
              )}
              {/* desktop: Sair */}
              <button onClick={handleLogout}
                aria-label="Sair da conta"
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition">
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                {t.signOut}
              </button>
              {/* sempre: Nova Tarefa */}
              <button onClick={() => setShowNewTask(true)} aria-label="Criar nova tarefa" className="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:from-violet-500 hover:to-indigo-500 transition shadow-lg shadow-violet-500/25">
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                <span className="hidden sm:inline">{t.newTask}</span>
              </button>
            </div>
          </div>

          {/* Row 2: controles secundários — visível apenas em mobile */}
          <div className={`relative flex sm:hidden items-center gap-2 px-3 pb-3 overflow-x-auto`} style={{ scrollbarWidth: 'none' }}>
            {/* Personalizar */}
            <button
              onClick={() => setShowPersonalizeModal(true)}
              aria-label={t.personalizeBtn}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${ctrlBg} hover:opacity-80 transition text-xs font-semibold whitespace-nowrap flex-shrink-0`}>
              <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
                <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
                <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
              </svg>
              {t.personalizeBtn}
            </button>
            {/* PT/EN toggle */}
            <div className={`flex items-center h-[30px] rounded-lg border ${ctrlBg} overflow-hidden text-xs font-bold flex-shrink-0`}>
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
            {/* Admin (se admin) */}
            {userRole === 'admin' && (
              <button
                onClick={() => router.push('/dashboard/admin')}
                aria-label="Acessar painel administrativo"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 text-violet-400 text-xs font-semibold whitespace-nowrap flex-shrink-0 hover:bg-violet-500/20 transition">
                <svg aria-hidden width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Admin
              </button>
            )}
            {/* mobile: Sair */}
            <button onClick={handleLogout}
              aria-label="Sair da conta"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 text-xs font-semibold whitespace-nowrap flex-shrink-0 hover:bg-red-500/20 transition">
              <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              {t.signOut}
            </button>
          </div>
        </div>

        <div className="px-3 py-4 sm:px-6 sm:py-6 flex flex-col gap-4 sm:gap-5">
          {loadingTasks && (
            <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-10">
              <span aria-hidden="true" className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              <span className="text-sm text-violet-500">{t.loadingTasks}</span>
            </div>
          )}

          {/* ── Stats compactos ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t.totalTasks,    value: total,     accent: 'text-violet-500', iconBg: 'bg-violet-500/10 border-violet-500/20', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
              { label: t.statusPending, value: nPending,  accent: dark ? 'text-white/60' : 'text-slate-500',  iconBg: 'bg-slate-500/10 border-slate-500/20',  icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
              { label: t.statProgress,  value: nProgress, accent: 'text-blue-500',   iconBg: 'bg-blue-500/10 border-blue-500/20',    icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg> },
              { label: t.sDonePlural,   value: nDone,     accent: 'text-emerald-500',iconBg: 'bg-emerald-500/10 border-emerald-500/20', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> },
            ].map(s => (
              <div key={s.label}
                aria-label={`${s.label}: ${s.value}`}
                tabIndex={0}
                className={`${cardBg} border rounded-xl px-4 py-3 flex items-center gap-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500`}>
                <div className={`w-7 h-7 rounded-lg ${s.iconBg} border flex items-center justify-center ${s.accent} flex-shrink-0`} aria-hidden="true">{s.icon}</div>
                <div>
                  <p className={`text-[10px] font-semibold ${textFaint} uppercase tracking-widest`} aria-hidden="true">{s.label}</p>
                  <p className={`text-xl font-black ${text} leading-tight`} aria-hidden="true">{s.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* progress bar */}
          <div className={`${cardBg} border rounded-xl px-4 py-3 flex items-center gap-3`}>
            <span className={`text-xs font-semibold ${textMuted} whitespace-nowrap`} aria-hidden="true">{t.completion}</span>
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
            <div className={`flex flex-col px-3 sm:px-5 py-3 border-b ${listBdr} gap-2`}>
              {/* Filtros de status + categorias na mesma linha */}
              <div className="flex flex-wrap items-center gap-2">
                <div className={`flex ${filterBg} border rounded-xl p-1 gap-1 overflow-x-auto`} style={{ scrollbarWidth: 'none' }}>
                  {filterTabs.map(f => (
                    <button key={f.key} onClick={() => setFilterReset(f.key)}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${filter === f.key ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : filterInact}`}>
                      {f.label}
                      {f.badge !== undefined && f.badge > 0 && (
                        <span className={`text-[10px] font-bold rounded-full px-1.5 py-px leading-none ${filter === f.key ? 'bg-white/25 text-white' : 'bg-red-500 text-white'}`}>{f.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className={`flex ${filterBg} border rounded-xl p-1 gap-1`}>
                  <button onClick={() => setPriorityFilterReset('All')}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${priorityFilter === 'All' ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : filterInact}`}>
                    {t.all}
                  </button>
                  {categories.map(cat => (
                    <button key={cat.priority} onClick={() => setPriorityFilterReset(priorityFilter === cat.priority ? 'All' : cat.priority)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${priorityFilter === cat.priority ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : filterInact}`}>
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cat.dot}`} />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* page size */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs ${textFaint} hidden sm:inline`}>{t.showLabel}</span>
                  <select value={pageSize} onChange={e => setPageSizeReset(Number(e.target.value))}
                    style={{ backgroundColor: dark ? '#0D1117' : undefined }}
                    className={`text-xs font-semibold px-2 py-1 rounded-lg border ${ctrlBg} outline-none cursor-pointer`}>
                    {[5, 10, 25].map(n => <option key={n} value={n} style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>{n}</option>)}
                  </select>
                  <span className={`text-xs ${textFaint} hidden sm:inline`}>{t.perPage}</span>
                </div>
              </div>
            </div>

            {/* list */}
            <ul
              aria-label="Lista de tarefas"
              aria-live="polite"
              className="flex flex-col list-none m-0 p-0"
              style={{ maxHeight: 'min(480px, 60vh)', overflowY: 'auto' }}
            >
              {paginated.length === 0 && (
                <li role="status" className="flex flex-col items-center justify-center py-14 gap-3">
                  <div aria-hidden="true" className={`w-11 h-11 rounded-2xl ${emptyIcon} border flex items-center justify-center`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                  </div>
                  <p className={`text-sm ${textFaint}`}>{t.noTasks}</p>
                </li>
              )}
              {paginated.map(task => (
                <TaskItem
                  key={task.id}
                  dark={dark}
                  locale={locale}
                  task={task}
                  dates={taskDates[task.id]}
                  expanded={!!expanded[task.id]}
                  isEditing={!!editing[task.id]}
                  description={descriptions[task.id] ?? ''}
                  draftDesc={draftDesc[task.id] ?? ''}
                  editingTitle={!!editingTitle[task.id]}
                  draftTitle={draftTitle[task.id] ?? ''}
                  editingDeadline={editingDeadlineId === task.id}
                  deadlineDraft={deadlineDraft[task.id] ?? ''}
                  deadlineHistory={deadlineHistory[task.id] ?? []}
                  t={{ priorityHigh: t.priorityHigh, priorityMedium: t.priorityMedium, priorityLow: t.priorityLow }}
                  theme={theme}
                  onToggleExpand={() => toggleExpand(task.id)}
                  onStartEdit={() => startEdit(task.id)}
                  onSaveDesc={() => saveDesc(task.id)}
                  onCancelEdit={() => cancelEdit(task.id)}
                  onSaveDescToBank={() => saveDescToBank(task.id)}
                  onSetDraftDesc={(val) => setDraftDesc(prev => ({ ...prev, [task.id]: val }))}
                  onStartEditTitle={() => startEditTitle(task.id, task.title)}
                  onSaveTitle={() => saveTitle(task.id)}
                  onCancelEditTitle={() => cancelEditTitle(task.id)}
                  onSetDraftTitle={(val) => setDraftTitle(prev => ({ ...prev, [task.id]: val }))}
                  onSetConfirmStart={() => setConfirmStartId(task.id)}
                  onFinishTask={() => finishTask(task.id)}
                  onSaveDeadline={() => saveDeadline(task.id)}
                  onSetConfirmDeadline={() => { setConfirmDeadlineId(task.id); setDeadlineChangeStep('ask') }}
                  onSetDeadlineStep={(s) => setDeadlineChangeStep(s)}
                  onSetEditingDeadline={() => { setEditingDeadlineId(task.id); setDeadlineDraft(prev => ({ ...prev, [task.id]: '' })) }}
                  onSetDeadlineDraft={(val) => setDeadlineDraft(prev => ({ ...prev, [task.id]: val }))}
                  onCancelDeadlineEdit={() => setEditingDeadlineId(null)}
                  onCancelTask={() => setConfirmCancelId(task.id)}
                  onDeleteTask={() => deleteTask(task.id)}
                />
              ))}
            </ul>

            {/* paginação */}
            {filtered.length > pageSize && (
              <div className={`flex items-center justify-between px-3 sm:px-5 py-3 border-t ${listBdr}`}>
                <span className={`text-xs ${textFaint}`}>
                  {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} {t.ofLbl} {filtered.length}
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

          {/* ── Analytics FastAPI ── */}
          {analytics?.status && (
            <Analytics
              dark={dark}
              locale={locale}
              analytics={analytics!}
              theme={theme}
            />
          )}

        </div>
      </main>
    </div>
  )
}

export default function DashboardPageWrapper() {
  return (
    <Suspense fallback={null}>
      <DashboardPage />
    </Suspense>
  )
}
