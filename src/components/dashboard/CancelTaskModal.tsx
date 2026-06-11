'use client'

import React from 'react'
import { translations, type Locale } from '@/lib/i18n'

interface CancelTaskModalProps {
  dark: boolean
  locale: Locale
  taskTitle: string
  reason: string
  setReason: (v: string) => void
  onConfirm: () => void
  onClose: () => void
}

export function CancelTaskModal({ dark, locale, taskTitle, reason, setReason, onConfirm, onClose }: CancelTaskModalProps) {
  const t = translations[locale]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="cancel-task-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className={`relative w-full max-w-sm mx-4 ${dark ? 'bg-[#0D1117] border-white/10' : 'bg-white border-slate-200'} border rounded-2xl p-6 shadow-2xl`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div>
            <h2 id="cancel-task-title" className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>{t.cancelTaskTitle}</h2>
            <p className={`text-[11px] ${dark ? 'text-white/50' : 'text-slate-500'} truncate max-w-[200px]`} title={taskTitle}>"{taskTitle}"</p>
          </div>
        </div>

        <label className={`text-xs font-semibold ${dark ? 'text-white/65' : 'text-slate-600'} uppercase tracking-widest mb-1.5 block`}>
          {t.cancelReasonLabel} <span className="text-rose-500 ml-0.5">*</span>
        </label>
        <textarea
          rows={3}
          placeholder={t.cancelReasonPlaceholder}
          value={reason}
          onChange={e => setReason(e.target.value)}
          autoFocus
          className={dark
            ? 'w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-rose-500/60 resize-none transition'
            : 'w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-rose-400 resize-none transition'}
        />

        <div className="flex gap-2 justify-end mt-4">
          <button type="button" onClick={onClose}
            className={`px-4 py-2 rounded-xl text-sm border ${dark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} transition`}>
            {t.cancelBtn}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!reason.trim()}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed transition"
          >
            {t.cancelTaskConfirmBtn}
          </button>
        </div>
      </div>
    </div>
  )
}
