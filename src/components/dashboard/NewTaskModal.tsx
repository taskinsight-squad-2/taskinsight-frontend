'use client'

import React from 'react'
import type { Task as ApiTask } from '@/types/task'
import { translations, type Locale } from '@/lib/i18n'

interface NewTaskModalProps {
  dark: boolean
  locale: Locale
  trapRef: React.RefObject<HTMLDivElement | null>
  form: { title: string; description: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; deadline: string }
  setForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; deadline: string }>>
  saving: boolean
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function NewTaskModal({ dark, locale, trapRef, form, setForm, saving, onSubmit, onClose }: NewTaskModalProps) {
  const t = translations[locale]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  const inputCls = dark
    ? 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-violet-500/60 transition'
    : 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 transition'
  const labelCls = `text-xs font-semibold ${dark ? 'text-white/65' : 'text-slate-600'} uppercase tracking-widest mb-1.5 block`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="modal-new-task-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div ref={trapRef} className={`relative w-full max-w-md mx-4 ${dark ? 'bg-[#0D1117] border-white/10' : 'bg-white border-slate-200'} border rounded-2xl p-6 shadow-2xl`}>
        <h2 id="modal-new-task-title" className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-900'} mb-5`}>{t.newTask}</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" aria-label={t.modalFormAria}>

          <div>
            <label htmlFor="new-task-title" className={labelCls}>{t.taskTitleLbl}</label>
            <input id="new-task-title" required placeholder={t.taskTitlePlaceholder} value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={inputCls} />
          </div>

          <div>
            <label htmlFor="new-task-deadline" className={labelCls}>
              {t.deadlineLbl} <span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              id="new-task-deadline"
              type="date"
              required
              min={tomorrow}
              value={form.deadline}
              onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
              style={{ backgroundColor: dark ? '#0D1117' : undefined, colorScheme: dark ? 'dark' : 'light' }}
              className={dark
                ? 'w-full bg-[#0D1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500/60 transition'
                : 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400 transition'}
            />
          </div>

          <div>
            <label htmlFor="new-task-desc" className={labelCls}>
              {t.taskDescLbl} <span className="text-red-500 ml-0.5">*</span>
            </label>
            <textarea id="new-task-desc" rows={3} required placeholder={t.taskDescPlaceholder} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={`${inputCls} resize-none`} />
          </div>

          <div>
            <span className={labelCls}>{t.priorityHeader}</span>
            <div className="flex gap-2 mt-1.5" role="group" aria-label={t.priorityHeader}>
              {([
                { value: 'HIGH'   as ApiTask['priority'], label: t.priorityHigh,   active: 'bg-red-500/15 border-red-500/40 text-red-400',    inactive: dark ? 'border-white/10 text-white/45 hover:border-red-500/30 hover:text-red-400'       : 'border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-500',    dot: 'bg-red-400'     },
                { value: 'MEDIUM' as ApiTask['priority'], label: t.priorityMedium, active: 'bg-amber-500/15 border-amber-500/40 text-amber-400', inactive: dark ? 'border-white/10 text-white/45 hover:border-amber-500/30 hover:text-amber-400' : 'border-slate-200 text-slate-500 hover:border-amber-300 hover:text-amber-500', dot: 'bg-amber-400'   },
                { value: 'LOW'    as ApiTask['priority'], label: t.priorityLow,    active: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400', inactive: dark ? 'border-white/10 text-white/45 hover:border-emerald-500/30 hover:text-emerald-400' : 'border-slate-200 text-slate-500 hover:border-emerald-300 hover:text-emerald-500', dot: 'bg-emerald-400' },
              ]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, priority: opt.value }))}
                  aria-pressed={form.priority === opt.value}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${form.priority === opt.value ? opt.active : opt.inactive}`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${opt.dot}`} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end mt-1">
            <button type="button" onClick={onClose}
              className={`px-4 py-2 rounded-xl text-sm border ${dark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} transition`}>
              {t.cancelBtn}
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50"
              aria-busy={saving}>
              {saving ? t.savingLabel : t.createTaskBtn}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
