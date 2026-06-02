'use client'

import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { translations, type Locale } from '@/lib/i18n'

type Priority = 'High' | 'Medium' | 'Low'
type Status   = 'Pending' | 'InProgress' | 'Done'
type FilterTab = 'All' | 'Pending' | 'InProgress' | 'Done'

interface TaskDates {
  created:   string        // sempre preenchido
  started:   string | null // preenchido ao clicar "Iniciar"
  finished:  string | null // preenchido ao clicar "Concluir"
  deadline:  string | null // meta do usuário
}

const tasksMeta: { priority: Priority; status: Status }[] = [
  { priority: 'High',   status: 'Pending'    },
  { priority: 'High',   status: 'InProgress' },
  { priority: 'Medium', status: 'Done'       },
  { priority: 'Low',    status: 'Pending'    },
  { priority: 'Medium', status: 'Done'       },
  { priority: 'Low',    status: 'InProgress' },
]

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

export default function DashboardPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const isNew        = searchParams.get('new') === 'true'
  const [locale, setLocale] = useState<Locale>('pt')
  const t = translations[locale]
  const [dark, setDark]               = useState(false)
  const [filter, setFilter]           = useState<FilterTab>('All')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [pageSize, setPageSize]       = useState(5)
  const [page, setPage]               = useState(1)

  // ── task state ───────────────────────────────────────────────────
  const initDates: Record<number, TaskDates> = Object.fromEntries(
    tasksMeta.map((m, i) => {
      const id = i + 1
      const created  = today()
      const started  = m.status !== 'Pending'    ? today() : null
      const finished = m.status === 'Done'        ? today() : null
      return [id, { created, started, finished, deadline: null }]
    })
  )
  const [taskStatuses,  setTaskStatuses]  = useState<Record<number, Status>>(
    isNew ? {} : Object.fromEntries(tasksMeta.map((m, i) => [i + 1, m.status]))
  )
  const [taskDates,  setTaskDates]  = useState<Record<number, TaskDates>>(isNew ? {} : initDates)
  const [expanded,   setExpanded]   = useState<Record<number, boolean>>({})
  const [editing,    setEditing]    = useState<Record<number, boolean>>({})
  const [descriptions, setDescriptions] = useState<Record<number, string>>({})
  const [draftDesc,  setDraftDesc]  = useState<Record<number, string>>({})
  const [deadlineDraft, setDeadlineDraft] = useState<Record<number, string>>({})
  const [toastMsg, setToastMsg]     = useState('')

  function showToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  function startTask(id: number) {
    setTaskStatuses(prev => ({ ...prev, [id]: 'InProgress' }))
    setTaskDates(prev => ({ ...prev, [id]: { ...prev[id], started: today() } }))
  }
  function finishTask(id: number) {
    const dates = taskDates[id]
    if (!dates?.started) { showToast('⚠ Inicie a tarefa antes de concluí-la.'); return }
    setTaskStatuses(prev => ({ ...prev, [id]: 'Done' }))
    setTaskDates(prev => ({ ...prev, [id]: { ...prev[id], finished: today() } }))
  }
  function reopenTask(id: number) {
    setTaskStatuses(prev => ({ ...prev, [id]: 'InProgress' }))
    setTaskDates(prev => ({ ...prev, [id]: { ...prev[id], finished: null } }))
  }
  function saveDeadline(id: number) {
    const val = deadlineDraft[id]
    if (!val) return
    setTaskDates(prev => ({ ...prev, [id]: { ...prev[id], deadline: val } }))
  }

  function toggleExpand(id: number) { setExpanded(prev => ({ ...prev, [id]: !prev[id] })) }
  function startEdit(id: number)    { setDraftDesc(prev => ({ ...prev, [id]: descriptions[id] ?? '' })); setEditing(prev => ({ ...prev, [id]: true })) }
  function saveDesc(id: number)     { setDescriptions(prev => ({ ...prev, [id]: draftDesc[id] ?? '' })); setEditing(prev => ({ ...prev, [id]: false })) }
  function cancelEdit(id: number)   { setEditing(prev => ({ ...prev, [id]: false })) }

  function completeAll() { setTaskStatuses(prev => Object.fromEntries(Object.keys(prev).map(k => [k, 'Done']))) }
  function clearDone()   { setTaskStatuses(prev => Object.fromEntries(Object.entries(prev).filter(([, v]) => v !== 'Done'))) }

  // ── derived data ─────────────────────────────────────────────────
  const tasks = useMemo(() => isNew ? [] : tasksMeta.map((meta, i) => ({
    id: i + 1,
    title: t.tasks[i].title,
    category: t.tasks[i].category,
    priority: meta.priority,
    status: (taskStatuses[i + 1] ?? meta.status) as Status,
  })), [t, taskStatuses, isNew])

  const categories = useMemo(() => Object.entries(t.categoryLabels).map(([, label], i) => ({
    label, count: [2, 2, 1, 1][i],
  })), [t])

  const total      = tasks.length
  const nPending   = tasks.filter(t => t.status === 'Pending').length
  const nProgress  = tasks.filter(t => t.status === 'InProgress').length
  const nDone      = tasks.filter(t => t.status === 'Done').length
  const completion = total > 0 ? Math.round((nDone / total) * 100) : 0

  const filtered = filter === 'All' ? tasks : tasks.filter(t => t.status === filter)
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  // reset page on filter/pageSize change
  function setFilterReset(f: FilterTab) { setFilter(f); setPage(1) }
  function setPageSizeReset(n: number)  { setPageSize(n); setPage(1) }

  // ── tokens por tema ───────────────────────────────────────────────
  const pageBg       = dark ? 'bg-[#080B14]'    : 'bg-[#F4F6FB]'
  const sidebarBg    = dark ? 'bg-[#0D1117]'    : 'bg-white'
  const sidebarBdr   = dark ? 'border-white/5'  : 'border-slate-200'
  const headerBg     = dark ? 'bg-[#080B14]/90' : 'bg-white/90'
  const headerBdr    = dark ? 'border-white/5'  : 'border-slate-200'
  const text         = dark ? 'text-white'       : 'text-slate-900'
  const textMuted    = dark ? 'text-white/55'    : 'text-slate-500'
  const textFaint    = dark ? 'text-white/40'    : 'text-slate-400'
  const sectionLbl   = dark ? 'text-white/40'    : 'text-slate-400'
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
  const timelineLbl  = dark ? 'text-white/35'   : 'text-slate-400'
  const timelineVal  = dark ? 'text-white/75'   : 'text-slate-700'
  const chevronCls   = dark ? 'text-white/30 hover:text-white/60' : 'text-slate-400 hover:text-slate-600'
  const showDescCls  = dark ? 'text-white/40 hover:text-white/65' : 'text-slate-400 hover:text-slate-600'
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

  const navItems = [
    { label: t.dashboard, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>, active: true },
    { label: t.allTasks,  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>, active: false },
    { label: t.pending,   icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, active: false },
    { label: t.completed, icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>, active: false },
  ]

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'All', label: t.all },
    { key: 'Pending', label: 'Pendente' },
    { key: 'InProgress', label: 'Em andamento' },
    { key: 'Done', label: t.statusDone },
  ]

  // ── dados dos gráficos ───────────────────────────────────────────
  // Séries: eixo X = semanas (simuladas), cada ponto acumula tarefas
  // Previsto: distribuição linear ideal de conclusão ao longo das semanas
  const weeks = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6']
  const nWeeks = weeks.length
  // Previsto: linha reta de 0 até total
  const plannedSeries = weeks.map((_, i) => Math.round((total / (nWeeks - 1)) * i))
  // Concluídas acumuladas (simuladas com base no nDone)
  const doneSeries    = [0, 0, Math.round(nDone * 0.3), Math.round(nDone * 0.6), nDone, nDone]
  // Em andamento acumulado
  const progressSeries = [0, nProgress > 0 ? 1 : 0, nProgress > 0 ? Math.round(nProgress * 0.5) : 0,
    nProgress, nProgress, nProgress]

  const GW = 500; const GH = 160; const GP = 32
  const gMax = Math.max(...plannedSeries, ...doneSeries, ...progressSeries, 1)
  function gx(i: number) { return GP + i * ((GW - GP * 2) / (nWeeks - 1)) }
  function gy(v: number) { return GH - GP - Math.round((v / gMax) * (GH - GP * 2)) }
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
  // área de desvio entre previsto e concluídas
  const areaDeviation = `${pathDone} L ${gx(nWeeks-1)} ${gy(plannedSeries[nWeeks-1])} ` +
    [...plannedSeries].reverse().map((v, i) => {
      const ri = nWeeks - 1 - i
      if (i === 0) return `L ${gx(ri)} ${gy(v)}`
      const next = plannedSeries[ri + 1]
      const cx = (gx(ri) + gx(ri + 1)) / 2
      return `C ${cx} ${gy(next)} ${cx} ${gy(v)} ${gx(ri)} ${gy(v)}`
    }).join(' ') + ' Z'

  const collapsed = sidebarCollapsed

  const sidebar = (
    <aside
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
          className={`w-7 h-7 flex items-center justify-center rounded-lg ${dark ? 'text-white/35 hover:bg-white/8 hover:text-white/70' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'} transition flex-shrink-0`}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .3s' }}>
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
      </div>

      {/* nav */}
      <nav className="flex flex-col gap-0.5 px-2 py-4 flex-1 overflow-y-auto overflow-x-hidden">
        {!collapsed && <p className={`text-[10px] font-bold ${sectionLbl} uppercase tracking-[0.15em] px-3 mb-2`}>{t.menu}</p>}
        {navItems.map(item => (
          <button key={item.label}
            title={collapsed ? item.label : undefined}
            className={`flex items-center rounded-xl text-sm font-medium transition-all w-full ${
              collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5 text-left'
            } ${item.active ? navAct : navInact}`}>
            {item.icon}
            {!collapsed && item.label}
          </button>
        ))}

        {!collapsed && (
          <>
            <p className={`text-[10px] font-bold ${sectionLbl} uppercase tracking-[0.15em] px-3 mt-6 mb-2`}>{t.categories}</p>
            {categories.map(cat => (
              <div key={cat.label} className={`flex items-center justify-between px-3 py-2 rounded-xl text-sm ${catItem} transition cursor-pointer`}>
                <span>{cat.label}</span>
                <span className={`text-[11px] ${catBadge} border rounded-full px-2 py-0.5 font-mono`}>{cat.count}</span>
              </div>
            ))}
          </>
        )}
      </nav>

      {/* footer */}
      <div className={`border-t ${sidebarBdr} flex items-center transition-all duration-300 ${collapsed ? 'justify-center px-2 py-4' : 'gap-3 px-4 py-4'}`}>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">HU</div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${text} truncate`}>Hugo</p>
              <p className={`text-xs ${userPlan}`}>{t.freePlan}</p>
            </div>
            <button onClick={() => router.push('/login')} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition">
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

      {/* toast */}
      {toastMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg">
          {toastMsg}
        </div>
      )}

      <div className="hidden md:flex flex-col h-screen sticky top-0">{sidebar}</div>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className={`fixed inset-0 ${mobileOverlay} backdrop-blur-sm`} onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 flex flex-col h-full">{sidebar}</div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-h-screen overflow-auto">

        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${headerBdr} ${headerBg} backdrop-blur-xl sticky top-0 z-30 transition-colors duration-300`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className={`md:hidden ${mobileTrigger} transition`}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div>
              <h1 className={`text-base font-bold ${text} tracking-tight`}>{t.goodMorning}, Hugo 👋</h1>
              <p className="text-xs text-violet-500 mt-0.5">{t.pendingTasksMsg(nPending)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={locale} onChange={e => setLocale(e.target.value as Locale)}
              className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${ctrlBg} outline-none cursor-pointer hover:opacity-80 transition`}>
              <option value="pt">PT-BR</option>
              <option value="en">EN</option>
            </select>
            <button onClick={() => setDark(v => !v)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg border ${ctrlBg} hover:opacity-80 transition text-sm`}>
              {dark ? '☀️' : '🌙'}
            </button>
            <button className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-semibold hover:from-violet-500 hover:to-indigo-500 transition shadow-lg shadow-violet-500/25">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              {t.newTask}
            </button>
          </div>
        </div>

        <div className="px-6 py-6 flex flex-col gap-5">

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
            <span className={`text-xs font-semibold ${textMuted} whitespace-nowrap`}>Conclusão</span>
            <div className={`flex-1 h-1.5 ${progressBg} rounded-full overflow-hidden`}>
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${completion}%`, background: 'linear-gradient(90deg,#7c3aed,#10b981)' }} />
            </div>
            <span className={`text-xs font-bold ${text} tabular-nums w-8 text-right`}>{completion}%</span>
          </div>

          {/* ── Task list ── */}
          <div className={`${cardBg} border rounded-2xl overflow-hidden`}>
            {/* toolbar */}
            <div className={`flex items-center justify-between px-5 py-3 border-b ${listBdr} flex-wrap gap-2`}>
              <div className={`flex ${filterBg} border rounded-xl p-1 gap-1`}>
                {filterTabs.map(f => (
                  <button key={f.key} onClick={() => setFilterReset(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f.key ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30' : filterInact}`}>
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                {/* page size */}
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs ${textFaint}`}>Mostrar</span>
                  <select value={pageSize} onChange={e => setPageSizeReset(Number(e.target.value))}
                    className={`text-xs font-semibold px-2 py-1 rounded-lg border ${ctrlBg} outline-none cursor-pointer`}>
                    {[5, 10, 25].map(n => <option key={n} value={n}>{n}</option>)}
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
            <div className="flex flex-col" style={{ maxHeight: 480, overflowY: 'auto' }}>
              {paginated.length === 0 && (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <div className={`w-11 h-11 rounded-2xl ${emptyIcon} border flex items-center justify-center`}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                  </div>
                  <p className={`text-sm ${textFaint}`}>{t.noTasks}</p>
                </div>
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

                return (
                  <div key={task.id} className={`border-b last:border-b-0 ${listBdr}`}>
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
                          <button onClick={() => startTask(task.id)} title="Iniciar"
                            className={`w-5 h-5 flex items-center justify-center rounded-full border-2 ${checkEmpty} transition`} />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate transition ${isDone ? taskDoneCls : taskActiveCls}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full ${priorityConfig[task.priority].color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${priorityConfig[task.priority].dot}`} />
                            {task.priority === 'High' ? t.priorityHigh : task.priority === 'Medium' ? t.priorityMedium : t.priorityLow}
                          </span>
                          <span className={`text-[11px] ${taskCat}`}>{task.category}</span>
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
                          <button onClick={() => { toggleExpand(task.id); if (!isExpanded) startEdit(task.id) }}
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
                            { lbl: 'Meta (prazo)', val: fmt(dates?.deadline ?? null), dot: 'bg-violet-500',
                              extra: (
                                <div className="flex items-center gap-1 mt-1">
                                  <input type="date" value={deadlineDraft[task.id] ?? ''}
                                    onChange={e => setDeadlineDraft(prev => ({ ...prev, [task.id]: e.target.value }))}
                                    className={inputDateCls} />
                                  <button onClick={() => saveDeadline(task.id)}
                                    className="text-[10px] px-2 py-0.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white font-semibold transition">
                                    ok
                                  </button>
                                </div>
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

                        {/* stats de tempo */}
                        <div className={`flex gap-4 text-xs pt-1 border-t ${dark ? 'border-white/5' : 'border-slate-200'}`}>
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
                          {isPending && (
                            <span className="text-amber-500 font-medium">Clique no círculo para iniciar a tarefa</span>
                          )}
                        </div>

                        {/* descrição */}
                        <div className={`pt-1 border-t ${dark ? 'border-white/5' : 'border-slate-200'}`}>
                          {isEditing ? (
                            <>
                              <textarea rows={3} placeholder="Adicione uma descrição para esta tarefa..."
                                value={draft} onChange={e => setDraftDesc(prev => ({ ...prev, [task.id]: e.target.value }))}
                                className={textareaCls} autoFocus />
                              <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => cancelEdit(task.id)}
                                  className={`text-xs px-3 py-1.5 rounded-lg border ${dark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} transition`}>
                                  Cancelar
                                </button>
                                <button onClick={() => saveDesc(task.id)}
                                  className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition">
                                  Salvar
                                </button>
                              </div>
                            </>
                          ) : savedDesc ? (
                            <>
                              <p className={`text-sm leading-relaxed ${descTextCls}`}>{savedDesc}</p>
                              <button onClick={() => startEdit(task.id)}
                                className={`mt-2 text-xs font-medium ${editBtnCls} flex items-center gap-1 transition`}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                Editar descrição
                              </button>
                            </>
                          ) : (
                            <button onClick={() => startEdit(task.id)}
                              className={`text-xs font-medium ${editBtnCls} flex items-center gap-1 transition`}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                              Adicionar descrição
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

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
          <div className={`${cardBg} border rounded-2xl p-5`}>
            <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
              <div>
                <p className={`text-xs font-bold ${sectionLbl} uppercase tracking-widest`}>Acompanhamento</p>
                <p className={`text-[11px] ${textFaint} mt-0.5`}>Previsto × Concluídas × Em andamento</p>
              </div>
              {/* legenda */}
              <div className="flex items-center gap-4">
                {[
                  { color: '#10b981', label: 'Concluídas',   dash: false },
                  { color: '#3b82f6', label: 'Andamento',    dash: false },
                  { color: dark ? 'rgba(255,255,255,.3)' : 'rgba(100,116,139,.5)', label: 'Previsto', dash: true },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <svg width="20" height="10">
                      {l.dash
                        ? <line x1="0" y1="5" x2="20" y2="5" stroke={l.color} strokeWidth="2" strokeDasharray="4 2" />
                        : <line x1="0" y1="5" x2="20" y2="5" stroke={l.color} strokeWidth="2.5" strokeLinecap="round" />}
                    </svg>
                    <span className={`text-[11px] ${textFaint}`}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <svg width="100%" viewBox={`0 0 ${GW} ${GH + 20}`} className="overflow-visible">
              <defs>
                <linearGradient id="gradDone" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="gradDev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.03" />
                </linearGradient>
              </defs>

              {/* linhas de grade horizontais */}
              {[0, 0.25, 0.5, 0.75, 1].map(f => {
                const yg = gy(Math.round(f * gMax))
                const val = Math.round(f * gMax)
                return (
                  <g key={f}>
                    <line x1={GP} y1={yg} x2={GW - GP} y2={yg}
                      stroke={dark ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)'} strokeWidth="1" />
                    <text x={GP - 6} y={yg + 4} textAnchor="end" fontSize="9"
                      fill={dark ? 'rgba(255,255,255,.3)' : '#94a3b8'}>{val}</text>
                  </g>
                )
              })}

              {/* área de desvio (entre previsto e concluídas) */}
              <path d={areaDeviation} fill="url(#gradDev)" />

              {/* área sob concluídas */}
              <path d={`${pathDone} L ${gx(nWeeks-1)} ${gy(0)} L ${gx(0)} ${gy(0)} Z`} fill="url(#gradDone)" />

              {/* linha previsto (tracejada) */}
              <path d={pathPlanned} fill="none"
                stroke={dark ? 'rgba(255,255,255,.3)' : 'rgba(100,116,139,.45)'}
                strokeWidth="1.5" strokeDasharray="6 3" strokeLinecap="round" />

              {/* linha andamento */}
              <path d={pathProgress} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

              {/* linha concluídas */}
              <path d={pathDone} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* pontos concluídas */}
              {doneSeries.map((v, i) => (
                <g key={i}>
                  <circle cx={gx(i)} cy={gy(v)} r="3.5" fill="#10b981" />
                  <circle cx={gx(i)} cy={gy(v)} r="6" fill="#10b981" opacity="0.15" />
                </g>
              ))}

              {/* pontos andamento */}
              {progressSeries.map((v, i) => (
                <circle key={i} cx={gx(i)} cy={gy(v)} r="3" fill="#3b82f6" />
              ))}

              {/* eixo X — labels semanas */}
              {weeks.map((w, i) => (
                <text key={w} x={gx(i)} y={GH + 14} textAnchor="middle" fontSize="10"
                  fill={dark ? 'rgba(255,255,255,.35)' : '#94a3b8'}>{w}</text>
              ))}
            </svg>

            {/* insight automático */}
            <div className={`mt-3 pt-3 border-t ${dark ? 'border-white/5' : 'border-slate-100'} flex items-center gap-2`}>
              {(() => {
                const lastDone    = doneSeries[doneSeries.length - 1]
                const lastPlanned = plannedSeries[plannedSeries.length - 1]
                const diff = lastDone - lastPlanned
                if (diff >= 0) return (
                  <>
                    <span className="text-xs font-semibold text-emerald-500">✓ Adiantado</span>
                    <span className={`text-xs ${textFaint}`}>{diff} tarefa{diff !== 1 ? 's' : ''} acima do previsto</span>
                  </>
                )
                return (
                  <>
                    <span className="text-xs font-semibold text-amber-500">⚠ Atraso</span>
                    <span className={`text-xs ${textFaint}`}>{Math.abs(diff)} tarefa{Math.abs(diff) !== 1 ? 's' : ''} abaixo do previsto</span>
                  </>
                )
              })()}
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
