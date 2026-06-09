'use client'

import type { Priority, Status } from '@/types/dashboard'

export function useDashboardTheme(dark: boolean) {
  const pageBg        = dark ? 'bg-[#080B14]'    : 'bg-[#F4F6FB]'
  const headerBg      = dark ? 'bg-[#080B14]/90' : 'bg-white/90'
  const headerBdr     = dark ? 'border-white/5'  : 'border-slate-200'
  const text          = dark ? 'text-white'       : 'text-slate-900'
  const textMuted     = dark ? 'text-white/70'    : 'text-slate-600'
  const textFaint     = dark ? 'text-white/55'    : 'text-slate-500'
  const sectionLbl    = dark ? 'text-white/55'    : 'text-slate-500'
  const navInact      = dark ? 'text-white/55 hover:text-white/80 hover:bg-white/5' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
  const navAct        = dark ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'bg-violet-50 text-violet-600 border border-violet-200'
  const catItem       = dark ? 'text-white/55 hover:text-white/75 hover:bg-white/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
  const catBadge      = dark ? 'bg-white/5 border-white/10 text-white/45' : 'bg-slate-100 border-slate-200 text-slate-500'
  const userPlan      = dark ? 'text-white/40'   : 'text-slate-400'
  const ctrlBg        = dark ? 'bg-white/5 border-white/10 text-white/65' : 'bg-white border-slate-200 text-slate-600'
  const cardBg        = dark ? 'bg-white/[0.03] border-white/8' : 'bg-white border-slate-200'
  const progressBg    = dark ? 'bg-white/5'      : 'bg-slate-100'
  const filterBg      = dark ? 'bg-white/5 border-white/8' : 'bg-slate-100 border-slate-200'
  const filterInact   = dark ? 'text-white/55 hover:text-white/80' : 'text-slate-500 hover:text-slate-800'
  const listBdr       = dark ? 'border-white/5'  : 'border-slate-100'
  const taskHover     = dark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50/70'
  const taskDoneCls   = dark ? 'line-through text-white/35' : 'line-through text-slate-400'
  const taskActiveCls = dark ? 'text-white/90'  : 'text-slate-800'
  const taskCat       = dark ? 'text-white/40'   : 'text-slate-400'
  const emptyIcon     = dark ? 'bg-white/5 border-white/8 text-white/20' : 'bg-slate-100 border-slate-200 text-slate-300'
  const checkEmpty    = dark ? 'border-white/15 group-hover:border-violet-500/50' : 'border-slate-300 group-hover:border-violet-400'
  const mobileTrigger = dark ? 'text-white/40 hover:text-white/70' : 'text-slate-400 hover:text-slate-700'
  const mobileOverlay = dark ? 'bg-black/60' : 'bg-black/30'
  const descAreaBg    = dark ? 'bg-white/[0.03] border-white/8' : 'bg-slate-50 border-slate-200'
  const descTextCls   = dark ? 'text-white/70'   : 'text-slate-600'
  const textareaCls   = dark
    ? 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/60 resize-none transition'
    : 'w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-violet-400 resize-none transition'
  const inputDateCls  = dark
    ? 'bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-violet-500/60 transition'
    : 'bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 outline-none focus:border-violet-400 transition'
  const timelineLbl   = dark ? 'text-white/55'   : 'text-slate-500'
  const timelineVal   = dark ? 'text-white/85'   : 'text-slate-700'
  const chevronCls    = dark ? 'text-white/55 hover:text-white/80' : 'text-slate-500 hover:text-slate-700'
  const showDescCls   = dark ? 'text-white/55 hover:text-white/80' : 'text-slate-500 hover:text-slate-700'
  const editBtnCls    = dark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-500 hover:text-violet-700'
  const pagBtnBase    = `text-xs px-2.5 py-1 rounded-lg border transition font-medium`
  const pagBtnActive  = dark ? 'bg-violet-600 border-violet-600 text-white' : 'bg-violet-600 border-violet-600 text-white'
  const pagBtnInact   = dark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'

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

  return {
    pageBg,
    headerBg,
    headerBdr,
    text,
    textMuted,
    textFaint,
    sectionLbl,
    navInact,
    navAct,
    catItem,
    catBadge,
    userPlan,
    ctrlBg,
    cardBg,
    progressBg,
    filterBg,
    filterInact,
    listBdr,
    taskHover,
    taskDoneCls,
    taskActiveCls,
    taskCat,
    emptyIcon,
    checkEmpty,
    mobileTrigger,
    mobileOverlay,
    descAreaBg,
    descTextCls,
    textareaCls,
    inputDateCls,
    timelineLbl,
    timelineVal,
    chevronCls,
    showDescCls,
    editBtnCls,
    pagBtnBase,
    pagBtnActive,
    pagBtnInact,
    priorityConfig,
    statusConfig,
  }
}

export type DashboardTheme = ReturnType<typeof useDashboardTheme>
