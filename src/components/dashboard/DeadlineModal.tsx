'use client'

import React from 'react'
import { fmt } from '@/lib/dashboard-utils'

interface DeadlineModalProps {
  dark: boolean
  trapRef: React.RefObject<HTMLDivElement | null>
  taskTitle: string
  oldDate: string
  deadlineDraft: string
  setDeadlineDraft: (val: string) => void
  deadlineChangeReason: string
  setDeadlineChangeReason: (val: string) => void
  step: 'ask' | 'edit' | null
  setStep: (s: 'ask' | 'edit' | null) => void
  onConfirm: () => void
  onClose: () => void
}

export function DeadlineModal({
  dark,
  trapRef,
  taskTitle,
  oldDate,
  deadlineDraft,
  setDeadlineDraft,
  deadlineChangeReason,
  setDeadlineChangeReason,
  step,
  setStep,
  onConfirm,
  onClose,
}: DeadlineModalProps) {
  const newDate = fmt(deadlineDraft || null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="modal-deadline-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div ref={trapRef} className={`relative w-full max-w-sm mx-4 ${dark ? 'bg-[#0D1117] border-white/10' : 'bg-white border-slate-200'} border rounded-2xl p-6 shadow-2xl`}>
        <div className="flex items-center gap-3 mb-3">
          <div aria-hidden="true" className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div>
            <p id="modal-deadline-title" className={`text-sm font-bold ${dark ? 'text-white' : 'text-slate-900'}`}>
              {step === 'ask' ? 'Deseja alterar o prazo?' : 'Informe a nova data e o motivo'}
            </p>
            <p className={`text-xs ${dark ? 'text-white/40' : 'text-slate-400'}`}>
              {step === 'ask' ? <>Prazo atual: <span className="text-violet-500 font-semibold">{oldDate}</span></> : <>{oldDate} → <span className="text-violet-500 font-semibold">{newDate || '?'}</span></>}
            </p>
          </div>
        </div>
        <p className={`text-xs ${dark ? 'text-white/55' : 'text-slate-500'} mb-4`}>
          <span className={`font-semibold ${dark ? 'text-white/80' : 'text-slate-700'}`}>{taskTitle}</span>
        </p>

        {/* etapa 1: confirmação */}
        {step === 'ask' && (
          <div className="flex gap-2 justify-end">
            <button onClick={onClose}
              className={`px-4 py-2 rounded-xl text-sm border ${dark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} transition`}>
              Não, cancelar
            </button>
            <button onClick={() => setStep('edit')}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 transition">
              Sim, alterar
            </button>
          </div>
        )}

        {/* etapa 2: nova data + justificativa */}
        {step === 'edit' && (
          <>
            <div className="mb-3">
              <label className={`text-xs font-semibold ${dark ? 'text-white/50' : 'text-slate-500'} uppercase tracking-widest mb-1.5 block`}>Nova data</label>
              <input type="date"
                value={deadlineDraft}
                onChange={e => setDeadlineDraft(e.target.value)}
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
              <button onClick={onClose}
                className={`px-4 py-2 rounded-xl text-sm border ${dark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} transition`}>
                Cancelar
              </button>
              <button onClick={onConfirm}
                disabled={!deadlineChangeReason.trim() || !deadlineDraft}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 transition disabled:bg-none disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed">
                Confirmar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
