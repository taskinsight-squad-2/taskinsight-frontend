'use client'

import type { ReactNode, Dispatch, SetStateAction } from 'react'
import type { Priority, SortMode } from '@/types/dashboard'

interface NavItem {
  label: string
  icon: ReactNode
  sort: SortMode
  badge?: number
}

interface Category {
  label: string
  count: number
  priority: Priority
  dot: string
}

interface SidebarTranslations {
  menu: string
  categories: string
  freePlan: string
  signOut: string
}

export interface SidebarProps {
  dark: boolean
  collapsed: boolean
  setCollapsed: Dispatch<SetStateAction<boolean>>
  showExpandTooltip: boolean
  sidebarOpen: boolean
  setSidebarOpen: Dispatch<SetStateAction<boolean>>
  navItems: NavItem[]
  sortMode: SortMode
  setSortMode: (s: SortMode) => void
  priorityFilter: Priority | 'All'
  setPriorityFilter: (p: Priority | 'All') => void
  categories: Category[]
  tasksCount: number
  userInitials: string
  userName: string
  handleLogout: () => void
  onPersonalize: () => void
  t: SidebarTranslations
}

export function Sidebar({
  dark, collapsed, setCollapsed, showExpandTooltip,
  sidebarOpen, setSidebarOpen,
  navItems, sortMode, setSortMode,
  priorityFilter, setPriorityFilter, categories, tasksCount,
  userInitials, userName, handleLogout, onPersonalize, t,
}: SidebarProps) {
  const text       = dark ? 'text-white'      : 'text-slate-900'
  const sectionLbl = dark ? 'text-white/55'   : 'text-slate-500'
  const userPlan   = dark ? 'text-white/40'   : 'text-slate-400'
  const navAct     = dark
    ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20'
    : 'bg-violet-50 text-violet-600 border border-violet-200'
  const navInact   = dark
    ? 'text-white/55 hover:text-white/80 hover:bg-white/5'
    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
  const catItem    = dark
    ? 'text-white/55 hover:text-white/75 hover:bg-white/5'
    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
  const catBadge   = dark
    ? 'bg-white/5 border-white/10 text-white/45'
    : 'bg-slate-100 border-slate-200 text-slate-500'
  const mobileOverlay = dark ? 'bg-black/60' : 'bg-black/30'
  const borderColor   = dark ? 'rgba(255,255,255,0.05)' : '#e2e8f0'

  return (
    <>
      {/* ── SIDEBAR DESKTOP ── */}
      <aside
        aria-label="Menu lateral de navegação"
        className="hidden md:flex flex-col border-r"
        style={{
          position: 'fixed', top: 0, left: 0, height: '100vh',
          width: collapsed ? 60 : 256, zIndex: 1000,
          transition: 'width 300ms',
          backgroundColor: dark ? '#0D1117' : '#ffffff',
          borderColor,
        }}
      >
        <div
          className={`flex border-b min-h-[73px] ${collapsed ? 'flex-col items-center justify-center gap-2 py-3' : 'flex-row items-center justify-between px-5 py-5'}`}
          style={{ borderColor }}
        >
          {collapsed ? (
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-500/30">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>
              <span className={`font-bold ${text} text-base tracking-tight flex-1`}>TaskFlow</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed(prev => !prev)}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors cursor-pointer relative z-[110] ${
              dark ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
            }`}
          >
            {collapsed ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            )}
          </button>
        </div>

        <nav aria-label="Navegação principal" className="flex flex-col gap-0.5 px-2 py-4 flex-1 overflow-y-auto overflow-x-hidden">
          {!collapsed && <p className={`text-[10px] font-bold ${sectionLbl} uppercase tracking-[0.15em] px-3 mb-2`}>{t.menu}</p>}
          {navItems.map(item => (
            <button key={item.label}
              title={collapsed ? item.label : undefined}
              onClick={() => setSortMode(item.sort)}
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
              <button onClick={() => setPriorityFilter('All')} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition ${priorityFilter === 'All' ? navAct : catItem}`}>
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dark ? 'bg-white/30' : 'bg-slate-400'}`} />
                  Todas
                </span>
                <span className={`text-[11px] border rounded-full px-2 py-0.5 font-mono ${priorityFilter === 'All' ? (dark ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-violet-100 border-violet-200 text-violet-600') : catBadge}`}>{tasksCount}</span>
              </button>
              {categories.map(cat => {
                const isActive = priorityFilter === cat.priority
                return (
                  <button key={cat.label} onClick={() => setPriorityFilter(isActive ? 'All' : cat.priority)} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition ${isActive ? navAct : catItem}`}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cat.dot}`} />
                      {cat.label}
                    </span>
                    <span className={`text-[11px] border rounded-full px-2 py-0.5 font-mono ${isActive ? (dark ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-violet-100 border-violet-200 text-violet-600') : catBadge}`}>{cat.count}</span>
                  </button>
                )
              })}
            </>
          )}

          {/* Personalizar experiência */}
          <div className="mt-auto pt-3" style={{ borderTop: `1px solid ${borderColor}`, marginTop: 'auto' }}>
            <button
              onClick={onPersonalize}
              title={collapsed ? 'Personalizar experiência' : undefined}
              aria-label="Personalizar experiência de acessibilidade"
              className={`flex items-center rounded-xl text-sm font-medium transition-all w-full ${collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2.5 text-left'} ${navInact}`}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
                <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
                <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
              </svg>
              {!collapsed && <span className="flex-1">Personalizar experiência</span>}
            </button>
          </div>
        </nav>

        <div className={`border-t flex items-center p-4 gap-3 ${collapsed ? 'justify-center' : ''}`} style={{ borderColor }}>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{userInitials}</div>
          {!collapsed && (
            <div className="flex-1 min-w-0 flex items-center justify-between">
              <div className="truncate pr-2">
                <p className={`text-sm font-semibold ${text} truncate`}>{userName || 'Usuário'}</p>
                <p className={`text-xs ${userPlan}`}>{t.freePlan}</p>
              </div>
              <button onClick={handleLogout} className="px-2 py-1 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition flex-shrink-0">{t.signOut}</button>
            </div>
          )}
        </div>
      </aside>

      {/* Tooltip customizado para expandir */}
      {collapsed && showExpandTooltip && (
        <div aria-hidden="true" style={{ position: 'fixed', left: 68, top: 32, zIndex: 9999, background: '#1e293b', color: '#fff', fontSize: 12, padding: '4px 8px', borderRadius: 6, pointerEvents: 'none', whiteSpace: 'nowrap' }}>
          Expandir menu
        </div>
      )}

      {/* ── SIDEBAR MOBILE ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[200] flex md:hidden">
          <div className={`fixed inset-0 ${mobileOverlay} backdrop-blur-sm`} onClick={() => setSidebarOpen(false)} />
          <div className="relative flex flex-col h-full w-72" style={{ backgroundColor: dark ? '#0D1117' : '#ffffff' }}>
            {/* Header */}
            <div className="px-5 py-4 flex justify-between items-center border-b" style={{ borderColor }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                </div>
                <span className={`font-bold ${text} text-base tracking-tight`}>TaskFlow</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Fechar menu"
                className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${dark ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {/* Navigation */}
            <nav aria-label="Navegação principal" className="flex flex-col gap-0.5 px-2 py-4 flex-1 overflow-y-auto overflow-x-hidden">
              <p className={`text-[10px] font-bold ${sectionLbl} uppercase tracking-[0.15em] px-3 mb-2`}>{t.menu}</p>
              {navItems.map(item => (
                <button key={item.label}
                  onClick={() => { setSortMode(item.sort); setSidebarOpen(false) }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left ${sortMode === item.sort ? navAct : navInact}`}>
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5 leading-none">{item.badge}</span>
                  )}
                </button>
              ))}

              <div className="flex items-center px-3 mt-6 mb-2">
                <p className={`text-[10px] font-bold ${sectionLbl} uppercase tracking-[0.15em]`}>{t.categories}</p>
              </div>
              <button onClick={() => { setPriorityFilter('All'); setSidebarOpen(false) }} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition ${priorityFilter === 'All' ? navAct : catItem}`}>
                <span className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dark ? 'bg-white/30' : 'bg-slate-400'}`} />
                  Todas
                </span>
                <span className={`text-[11px] border rounded-full px-2 py-0.5 font-mono ${priorityFilter === 'All' ? (dark ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-violet-100 border-violet-200 text-violet-600') : catBadge}`}>{tasksCount}</span>
              </button>
              {categories.map(cat => {
                const isActive = priorityFilter === cat.priority
                return (
                  <button key={cat.label} onClick={() => { setPriorityFilter(isActive ? 'All' : cat.priority); setSidebarOpen(false) }} className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition ${isActive ? navAct : catItem}`}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cat.dot}`} />
                      {cat.label}
                    </span>
                    <span className={`text-[11px] border rounded-full px-2 py-0.5 font-mono ${isActive ? (dark ? 'bg-violet-500/20 border-violet-500/30 text-violet-300' : 'bg-violet-100 border-violet-200 text-violet-600') : catBadge}`}>{cat.count}</span>
                  </button>
                )
              })}

              {/* Personalizar experiência */}
              <div className="mt-auto pt-3" style={{ borderTop: `1px solid ${borderColor}` }}>
                <button
                  onClick={() => { onPersonalize(); setSidebarOpen(false) }}
                  aria-label="Personalizar experiência de acessibilidade"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left ${navInact}`}
                >
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
                    <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
                    <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
                  </svg>
                  <span className="flex-1">Personalizar experiência</span>
                </button>
              </div>
            </nav>

            {/* Footer */}
            <div className="border-t flex items-center p-4 gap-3" style={{ borderColor }}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{userInitials}</div>
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div className="truncate pr-2">
                  <p className={`text-sm font-semibold ${text} truncate`}>{userName || 'Usuário'}</p>
                  <p className={`text-xs ${userPlan}`}>{t.freePlan}</p>
                </div>
                <button onClick={() => { handleLogout(); setSidebarOpen(false) }} className="px-2 py-1 rounded-lg text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition flex-shrink-0">{t.signOut}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
