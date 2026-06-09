'use client'

import React from 'react'

interface ConfirmStartModalProps {
  dark: boolean
  trapRef: React.RefObject<HTMLDivElement | null>
  task: { title: string; priority: 'High' | 'Medium' | 'Low' }
  priorityLabels: { High: string; Medium: string; Low: string }
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmStartModal({ dark, trapRef, task, priorityLabels, onConfirm, onClose }: ConfirmStartModalProps) {
  const priorityLabel = task.priority === 'High' ? priorityLabels.High : task.priority === 'Medium' ? priorityLabels.Medium : priorityLabels.Low
  const priorityColor = task.priority === 'High' ? 'text-red-500' : task.priority === 'Medium' ? 'text-amber-500' : 'text-emerald-500'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="modal-start-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div ref={trapRef} className={`relative w-full max-w-sm mx-4 ${dark ? 'bg-[#0D1117] border-white/10' : 'bg-white border-slate-200'} border rounded-2xl p-6 shadow-2xl`}>
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
          <span className={`font-semibold ${dark ? 'text-white/80' : 'text-slate-700'}`}>{task.title}</span>
        </p>
        <p className={`text-xs ${dark ? 'text-white/40' : 'text-slate-400'} mb-5`}>
          Ao iniciar, o tempo começa a ser contado. Certifique-se de que vai trabalhar nela agora.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose}
            className={`px-4 py-2 rounded-xl text-sm border ${dark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} transition`}>
            Agora não
          </button>
          <button onClick={onConfirm}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition shadow-lg shadow-blue-500/25">
            Sim, iniciar!
          </button>
        </div>
      </div>
    </div>
  )
}
