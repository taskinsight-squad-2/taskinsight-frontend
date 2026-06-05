'use client'

export const dynamic = 'force-dynamic'
import { useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { translations, type Locale } from '@/lib/i18n'

type Priority = 'High' | 'Medium' | 'Low'
type Status = 'Pending' | 'Done'
type FilterTab = 'All' | 'Pending' | 'Done'

interface Task {
  id: number
  title: string
  priority: Priority
  category: string
  date: string
  status: Status
}

const tasksMeta: { priority: Priority; date: string; status: Status }[] = [
  { priority: 'High', date: 'Jun 20', status: 'Pending' },
  { priority: 'High', date: 'Jun 21', status: 'Pending' },
  { priority: 'Medium', date: 'Jun 22', status: 'Done' },
  { priority: 'Low', date: 'Jun 23', status: 'Pending' },
  { priority: 'Medium', date: 'Jun 24', status: 'Done' },
  { priority: 'Low', date: 'Jun 25', status: 'Pending' },
]

const priorityStyle: Record<Priority, string> = {
  High: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  Medium: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  Low: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
}

const statusStyle: Record<Status, string> = {
  Pending: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  Done: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
}

export default function DashboardPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNew = searchParams.get('new') === 'true'
  const [locale, setLocale] = useState<Locale>('pt')
  const t = translations[locale]
  const [darkMode, setDarkMode] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('All')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const initialTasks = useMemo(() => tasksMeta.map((meta, i) => ({
    id: i + 1,
    title: t.tasks[i].title,
    category: t.tasks[i].category,
    ...meta,
  })), [t])

  const [taskStatuses, setTaskStatuses] = useState<Record<number, Status>>(
    isNew ? {} : Object.fromEntries(tasksMeta.map((m, i) => [i + 1, m.status]))
  )

  const tasks = useMemo(() => isNew ? [] : tasksMeta.map((meta, i) => ({
    id: i + 1,
    title: t.tasks[i].title,
    category: t.tasks[i].category,
    priority: meta.priority,
    date: meta.date,
    status: (taskStatuses[i + 1] ?? meta.status) as Status,
  })), [t, taskStatuses, isNew])

  const categories = useMemo(() => Object.entries(t.categoryLabels).map(([, label], i) => ({
    label,
    count: [2, 2, 1, 1][i],
  })), [t])

  const total = tasks.length
  const pending = tasks.filter(t => t.status === 'Pending').length
  const done = tasks.filter(t => t.status === 'Done').length
  const completion = total > 0 ? Math.round((done / total) * 100) : 0

  const filtered = filter === 'All' ? tasks : tasks.filter(t => t.status === filter)

  function toggleTask(id: number) {
    setTaskStatuses(prev => ({ ...prev, [id]: prev[id] === 'Done' ? 'Pending' : 'Done' }))
  }

  function completeAll() {
    setTaskStatuses(prev => Object.fromEntries(Object.keys(prev).map(k => [k, 'Done'])))
  }

  function clearDone() {
    setTaskStatuses(prev => Object.fromEntries(Object.entries(prev).filter(([, v]) => v !== 'Done')))
  }

  const navItems = [
    { label: t.dashboard, icon: '⊞', active: true },
    { label: t.allTasks, icon: '☰', active: false },
    { label: t.pending, icon: '⏳', active: false },
    { label: t.completed, icon: '✓', active: false },
  ]

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'All', label: t.all },
    { key: 'Pending', label: t.statusPending },
    { key: 'Done', label: t.statusDone },
  ]

  const sidebar = (
    <aside className="w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col h-full">
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-[#7C3AED] flex items-center justify-center">
          <span className="text-white text-sm">⚡</span>
        </div>
        <span className="font-extrabold text-gray-900 dark:text-white text-lg">TaskFlow</span>
      </div>

      <nav className="flex flex-col gap-1 px-3 py-4 flex-1">
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-3 mb-2 uppercase tracking-wider">{t.menu}</p>
        {navItems.map(item => (
          <button
            key={item.label}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left ${
              item.active
                ? 'bg-purple-50 dark:bg-purple-900/20 text-[#7C3AED] dark:text-purple-400'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <span>{item.icon}</span> {item.label}
          </button>
        ))}

        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 px-3 mt-6 mb-2 uppercase tracking-wider">{t.categories}</p>
        {categories.map(cat => (
          <div key={cat.label} className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">
            <span>{cat.label}</span>
            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full px-2 py-0.5">{cat.count}</span>
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#7C3AED] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">HU</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">Hugo</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{t.freePlan}</p>
        </div>
        <button onClick={() => router.push('/login')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:opacity-80 transition">
          ⎋ {t.signOut}
        </button>
      </div>
    </aside>
  )

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-gray-950 transition-colors duration-300">

        <div className="hidden md:flex flex-col h-screen sticky top-0">
          {sidebar}
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 flex md:hidden">
            <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
            <div className="relative z-50 flex flex-col h-full">
              {sidebar}
            </div>
          </div>
        )}

        <main className="flex-1 flex flex-col min-h-screen overflow-auto">

          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-500 dark:text-gray-400 text-xl">☰</button>
              <div>
                <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{t.goodMorning}, Hugo 👋</h1>
                <p className="text-sm text-blue-500 dark:text-blue-400 mt-0.5">{t.pendingTasksMsg(pending)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={locale}
                onChange={e => setLocale(e.target.value as Locale)}
                className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-none outline-none cursor-pointer hover:opacity-80 transition"
              >
                <option value="pt">PT-BR</option>
                <option value="en">EN</option>
              </select>
              <button
                onClick={() => setDarkMode(v => !v)}
                className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:opacity-80 transition"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7C3AED] to-[#9F67FF] text-white text-sm font-semibold shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:opacity-90 transition">
                <span>+</span> {t.newTask}
              </button>
            </div>
          </div>

          <div className="px-6 pb-8 flex flex-col gap-6">

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t.totalTasks}</span>
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-[#7C3AED] dark:text-purple-400">⊞</div>
                </div>
                <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{total}</span>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t.pending}</span>
                  <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500 dark:text-orange-400">⏳</div>
                </div>
                <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{pending}</span>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">{t.completion}</span>
                  <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-500 dark:text-green-400">✓</div>
                </div>
                <span className="text-3xl font-extrabold text-gray-900 dark:text-white">{completion}%</span>
                <div className="w-full h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${completion}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm p-5 flex flex-col gap-4">

              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
                  {filterTabs.map(f => (
                    <button
                      key={f.key}
                      onClick={() => setFilter(f.key)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                        filter === f.key
                          ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={completeAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:opacity-80 transition">
                    ✓ {t.completeAll}
                  </button>
                  <button onClick={clearDone} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 hover:opacity-80 transition">
                    🗑 {t.clearDone}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {filtered.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">{t.noTasks}</p>
                )}
                {filtered.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition group"
                  >
                    <button onClick={() => toggleTask(task.id)} className="flex-shrink-0">
                      {task.status === 'Done'
                        ? <span className="w-5 h-5 flex items-center justify-center rounded-full bg-green-500 text-white text-xs">✓</span>
                        : <span className="w-5 h-5 flex items-center justify-center rounded-full border-2 border-gray-300 dark:border-gray-600" />
                      }
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${task.status === 'Done' ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-800 dark:text-white'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${priorityStyle[task.priority]}`}>
                          {task.priority === 'High' ? t.priorityHigh : task.priority === 'Medium' ? t.priorityMedium : t.priorityLow}
                        </span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{task.category}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">· {task.date}</span>
                      </div>
                    </div>

                    <span className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ${statusStyle[task.status]}`}>
                      {task.status === 'Done' ? t.statusDone : t.statusPending}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
