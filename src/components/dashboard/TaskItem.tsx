'use client'

import React from 'react'
import { fmt, daysBetween, slaInfo, today } from '@/lib/dashboard-utils'
import type { DashboardTheme } from '@/hooks/useDashboardTheme'
import { translations, type Locale } from '@/lib/i18n'

interface TaskItemProps {
  dark: boolean
  task: { id: string; title: string; priority: 'High' | 'Medium' | 'Low'; status: 'Pending' | 'InProgress' | 'Done' | 'Cancelled' }
  dates: { created: string; started: string | null; finished: string | null; deadline: string | null; originalDeadline: string | null } | undefined
  expanded: boolean
  isEditing: boolean
  description: string
  draftDesc: string
  editingTitle: boolean
  draftTitle: string
  editingDeadline: boolean
  deadlineDraft: string
  deadlineHistory: Array<{ oldDate: string | null; newDate: string; reason: string; changedAt: string }>
  locale: Locale
  t: { priorityHigh: string; priorityMedium: string; priorityLow: string }
  theme: DashboardTheme
  onToggleExpand: () => void
  onStartEdit: () => void
  onSaveDesc: () => void
  onCancelEdit: () => void
  onSaveDescToBank: () => void
  onSetDraftDesc: (val: string) => void
  onStartEditTitle: () => void
  onSaveTitle: () => void
  onCancelEditTitle: () => void
  onSetDraftTitle: (val: string) => void
  onSetConfirmStart: () => void
  onFinishTask: () => void
  onSaveDeadline: () => void
  onSetConfirmDeadline: () => void
  onSetDeadlineStep: (s: 'ask') => void
  onSetEditingDeadline: () => void
  onSetDeadlineDraft: (val: string) => void
  onCancelDeadlineEdit: () => void
  onCancelTask?: () => void
  onDeleteTask?: () => void
}

export function TaskItem({
  dark,
  task,
  dates,
  locale,
  expanded,
  isEditing,
  description,
  draftDesc,
  editingTitle,
  draftTitle,
  editingDeadline,
  deadlineDraft,
  deadlineHistory,
  t,
  theme,
  onToggleExpand,
  onStartEdit,
  onSaveDesc,
  onCancelEdit,
  onSaveDescToBank,
  onSetDraftDesc,
  onStartEditTitle,
  onSaveTitle,
  onCancelEditTitle,
  onSetDraftTitle,
  onSetConfirmStart,
  onFinishTask,
  onSaveDeadline,
  onSetConfirmDeadline,
  onSetDeadlineStep,
  onSetEditingDeadline,
  onSetDeadlineDraft,
  onCancelDeadlineEdit,
  onCancelTask,
  onDeleteTask,
}: TaskItemProps) {
  const {
    listBdr, taskHover, taskDoneCls, taskActiveCls,
    priorityConfig, statusConfig, chevronCls, showDescCls,
    descAreaBg, timelineLbl, timelineVal, textFaint, text,
    inputDateCls, editBtnCls, descTextCls, textareaCls,
  } = theme
  const tl = translations[locale]

  const stalled      = daysBetween(dates?.created ?? null, dates?.started ?? null)
  const inProg       = daysBetween(dates?.started ?? null, dates?.finished ?? today())
  const isRunning    = task.status === 'InProgress'
  const isPending    = task.status === 'Pending'
  const isDone       = task.status === 'Done'
  const isCancelled  = task.status === 'Cancelled'
  const isActive     = isPending || isRunning
  const hasProrrog   = dates?.originalDeadline && dates?.deadline && dates.originalDeadline !== dates.deadline
  const sla          = slaInfo(dates?.originalDeadline ?? null, dates?.finished ?? null)

  const titleCls = isDone || isCancelled ? taskDoneCls : taskActiveCls

  return (
    <li
      className={`border-b last:border-b-0 ${listBdr}`}
      aria-label={`${task.title}, ${statusConfig[task.status]?.label ?? task.status}, ${task.priority === 'High' ? t.priorityHigh : task.priority === 'Medium' ? t.priorityMedium : t.priorityLow}`}
    >
      <div className={`px-3 sm:px-5 py-3 sm:py-3.5 ${taskHover} transition group`}>

        {/* ── top row: title + date | priority + status + chevron ── */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* left: title (+ inline date when not editing) */}
          <div className="flex-1 min-w-0">
            {editingTitle && !isDone && !isCancelled ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={draftTitle}
                  onChange={e => onSetDraftTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') onSaveTitle(); if (e.key === 'Escape') onCancelEditTitle() }}
                  className={`flex-1 text-sm font-medium rounded-lg px-2 py-1 outline-none border ${
                    dark ? 'bg-white/5 border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                  } transition`}
                />
                <button onClick={onSaveTitle} className="text-[10px] px-2 py-1 rounded-md bg-violet-600 hover:bg-violet-500 text-white font-semibold transition">ok</button>
                <button onClick={onCancelEditTitle} className={`text-[10px] px-2 py-1 rounded-md border ${ dark ? 'border-white/10 text-white/50' : 'border-slate-200 text-slate-400'} transition`}>✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0 group/title">
                  <p className={`text-sm font-medium truncate transition ${titleCls}`}>{task.title}</p>
                  {isActive && (
                    <button
                      onClick={onStartEditTitle}
                      className={`flex-shrink-0 opacity-0 group-hover/title:opacity-100 transition ${ dark ? 'text-white/30 hover:text-white/60' : 'text-slate-300 hover:text-slate-500'}`}
                      title={tl.editTitleTooltip}
                    >
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  )}
                </div>
                {dates?.deadline && (
                  <span className={`text-[11px] font-medium flex-shrink-0 ${dark ? 'text-violet-400' : 'text-violet-500'}`}>
                    🎯 {fmt(dates.deadline)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* right: priority + status + chevron */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${priorityConfig[task.priority].color}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priorityConfig[task.priority].dot}`} />
              <span className="hidden sm:inline">{task.priority === 'High' ? t.priorityHigh : task.priority === 'Medium' ? t.priorityMedium : t.priorityLow}</span>
            </span>
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${statusConfig[task.status]?.color ?? ''}`}>
              {statusConfig[task.status]?.label ?? task.status}
            </span>
            {/* chevron accordion */}
            {!description ? (
              <button onClick={() => { onToggleExpand(); if (!expanded && isActive) onStartEdit() }}
                className={`${chevronCls} transition`} title={tl.detailsTitle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            ) : (
              <button onClick={onToggleExpand}
                className={`text-[11px] font-medium ${showDescCls} flex items-center gap-0.5 transition`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                {expanded ? tl.hideLabel : tl.descLabel}
              </button>
            )}
          </div>
        </div>

        {/* ── action buttons — always visible ── */}
        <div className="flex gap-2 flex-wrap mt-2.5">
          {isPending && (
            <button
              onClick={onSetConfirmStart}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              {tl.startTitle}
            </button>
          )}
          {isRunning && (
            <button
              onClick={onFinishTask}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              {tl.finishTitle}
            </button>
          )}
          {isRunning && (
            <button
              onClick={() => {
                if (dates?.deadline) {
                  onSetConfirmDeadline()
                  onSetDeadlineStep('ask')
                } else {
                  onSetEditingDeadline()
                }
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white shadow-sm"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              {tl.actionProrrogar}
            </button>
          )}
          {isActive && onCancelTask && (
            <button
              onClick={onCancelTask}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition bg-slate-600 hover:bg-slate-700 active:bg-slate-800 text-white shadow-sm"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              {tl.actionCancelar}
            </button>
          )}
          {isCancelled && onDeleteTask && (
            <button
              onClick={onDeleteTask}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              {tl.actionExcluir}
            </button>
          )}
        </div>
      </div>

      {/* ── accordion ── */}
      {expanded && (
        <div className={`mx-3 sm:mx-5 mb-4 rounded-xl border ${descAreaBg} p-3 sm:p-4 flex flex-col gap-4`}>

          {/* timeline */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { lbl: tl.tlCreated,    val: fmt(dates?.created ?? null),  dot: 'bg-slate-400' },
              { lbl: hasProrrog ? tl.tlDeadlineCurrent : tl.tlDeadlineGoal, val: fmt(dates?.deadline ?? null), dot: 'bg-violet-500',
                extra: (
                  <button
                    onClick={() => {
                      if (!isActive) return
                      if (dates?.deadline) {
                        onSetConfirmDeadline()
                        onSetDeadlineStep('ask')
                      } else {
                        onSetEditingDeadline()
                      }
                    }}
                    disabled={!isActive}
                    className={`mt-1 flex items-center gap-1 text-[10px] font-medium transition ${!isActive ? `${dark ? 'text-white/35' : 'text-slate-400'} cursor-not-allowed` : `${dark ? 'text-violet-400/70 hover:text-violet-300' : 'text-violet-400 hover:text-violet-600'} cursor-pointer`}`}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    {dates?.deadline ? tl.changeDeadline : tl.setDeadline}
                  </button>
                )
              },
              { lbl: tl.tlStarted,  val: dates?.started  ? fmt(dates.started)  : isPending ? tl.notStartedFmt : '—', dot: 'bg-blue-400' },
              { lbl: tl.tlFinished, val: dates?.finished ? fmt(dates.finished) : '—', dot: 'bg-emerald-500' },
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

          {/* prazo original */}
          {hasProrrog && (
            <div className={`-mt-1 pt-3 border-t ${dark ? 'border-white/5' : 'border-slate-200'} flex items-center gap-2`}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              <span className={`text-[10px] font-semibold uppercase tracking-widest ${timelineLbl}`}>{tl.tlOriginal}</span>
              <span className={`text-[11px] font-medium ${dark ? 'text-amber-300' : 'text-amber-600'}`}>{fmt(dates?.originalDeadline ?? null)}</span>
              <span className={`text-[10px] ${dark ? 'text-white/50' : 'text-slate-500'}`}>{tl.extendedLabel}</span>
            </div>
          )}

          {/* definir prazo inline */}
          {editingDeadline && (
            <div className={`-mt-1 pt-3 border-t ${dark ? 'border-white/5' : 'border-slate-200'} flex flex-col gap-2`}>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0`} />
                <span className={`text-[10px] font-semibold uppercase tracking-widest ${timelineLbl}`}>{tl.setDeadlineSection}</span>
              </div>
              <div className="pl-3 flex items-center gap-2">
                <input type="date"
                  value={deadlineDraft}
                  onChange={e => onSetDeadlineDraft(e.target.value)}
                  className={inputDateCls} autoFocus />
                <button onClick={onSaveDeadline}
                  className="text-[10px] px-2 py-0.5 rounded-md bg-violet-600 hover:bg-violet-500 text-white font-semibold transition">ok</button>
                <button onClick={onCancelDeadlineEdit}
                  className={`text-[10px] px-1.5 py-0.5 rounded-md border ${dark ? 'border-white/10 text-white/40' : 'border-slate-200 text-slate-400'} transition`}>✕</button>
              </div>
            </div>
          )}

          {/* histórico de alterações de prazo */}
          {(deadlineHistory?.length ?? 0) > 0 && (
            <div className={`pt-3 border-t ${dark ? 'border-white/5' : 'border-slate-200'} flex flex-col gap-2`}>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                <span className={`text-[10px] font-semibold uppercase tracking-widest ${timelineLbl}`}>{tl.deadlineNotes}</span>
              </div>
              <div className="pl-3 flex flex-col gap-2">
                {deadlineHistory.map((entry, i) => (
                  <div key={i} className={`rounded-lg px-3 py-2 ${dark ? 'bg-amber-500/5 border border-amber-500/15' : 'bg-amber-50 border border-amber-200'}`}>
                    <p className={`text-[10px] ${dark ? 'text-white/55' : 'text-slate-500'} mb-0.5`}>
                      {tl.tlInitial} <span className={`font-semibold ${dark ? 'text-white/55' : 'text-slate-500'}`}>{fmt(entry.oldDate)}</span>
                    </p>
                    <p className={`text-[10px] font-semibold ${dark ? 'text-amber-400' : 'text-amber-700'} mb-1`}>
                      {tl.newDeadlineLabel} {fmt(entry.newDate)} <span className={`font-normal ${dark ? 'text-white/50' : 'text-slate-500'}`}>· {entry.changedAt}</span>
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
                {tl.stalledPrefix} <strong className={text}>{stalled}d</strong> {tl.stalledSuffix}
              </span>
            )}
            {isRunning && dates?.started && (
              <span className={textFaint}>
                {tl.runningPrefix} <strong className={text}>{inProg}d</strong>
              </span>
            )}
            {isDone && dates?.started && dates?.finished && (
              <span className={textFaint}>
                {tl.donePrefix} <strong className={text}>{inProg}d</strong>
              </span>
            )}
            {sla !== null && isDone && (
              <span className={sla.onTime
                ? `font-medium ${dark ? 'text-emerald-400' : 'text-emerald-600'}`
                : `font-medium ${dark ? 'text-red-400' : 'text-red-600'}`}>
                {sla.onTime ? tl.slaOnTimeFn(sla.days) : tl.slaLateFn(sla.days)}
              </span>
            )}
            {isPending && (
              <span className="text-amber-500 font-medium">{tl.startHint}</span>
            )}
          </div>

          {/* descrição */}
          <div className={`pt-1 border-t ${dark ? 'border-white/5' : 'border-slate-200'}`}>
            {isEditing && isActive ? (
              <>
                <textarea rows={3} placeholder={tl.descPlaceholder}
                  value={draftDesc} onChange={e => onSetDraftDesc(e.target.value)}
                  className={textareaCls} autoFocus />
                <div className="flex justify-end gap-2 mt-2">
                  <button onClick={onCancelEdit}
                    className={`text-xs px-3 py-1.5 rounded-lg border ${dark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} transition`}>
                    {tl.cancelBtn}
                  </button>
                  <button onClick={onSaveDescToBank}
                    className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold transition">
                    {tl.saveBtn}
                  </button>
                </div>
              </>
            ) : description ? (
              <>
                <p className={`text-sm leading-relaxed ${descTextCls}`}>{description}</p>
                {isActive && (
                  <button onClick={onStartEdit}
                    className={`mt-2 text-xs font-medium ${editBtnCls} flex items-center gap-1 transition`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    {tl.editDescBtn}
                  </button>
                )}
              </>
            ) : isActive ? (
              <button onClick={onStartEdit}
                className={`text-xs font-medium ${editBtnCls} flex items-center gap-1 transition`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                {tl.addDescBtn}
              </button>
            ) : (
              <p className={`text-xs italic ${dark ? 'text-white/45' : 'text-slate-400'}`}>{tl.noDescLabel}</p>
            )}
          </div>
        </div>
      )}
    </li>
  )
}
