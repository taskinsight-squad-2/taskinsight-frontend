'use client'

import React from 'react'
import type { Task as ApiTask } from '@/types/task'

interface NewTaskModalProps {
  dark: boolean
  trapRef: React.RefObject<HTMLDivElement | null>
  form: { title: string; description: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' }
  setForm: React.Dispatch<React.SetStateAction<{ title: string; description: string; priority: 'HIGH' | 'MEDIUM' | 'LOW' }>>
  saving: boolean
  onSubmit: (e: React.FormEvent) => void
  onClose: () => void
}

export function NewTaskModal({ dark, trapRef, form, setForm, saving, onSubmit, onClose }: NewTaskModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="modal-new-task-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div ref={trapRef} className={`relative w-full max-w-md mx-4 ${dark ? 'bg-[#0D1117] border-white/10' : 'bg-white border-slate-200'} border rounded-2xl p-6 shadow-2xl`}>
        <h2 id="modal-new-task-title" className={`text-base font-bold ${dark ? 'text-white' : 'text-slate-900'} mb-5`}>Nova Tarefa</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" aria-label="Criar nova tarefa">
          <div>
            <label htmlFor="new-task-title" className={`text-xs font-semibold ${dark ? 'text-white/65' : 'text-slate-600'} uppercase tracking-widest mb-1.5 block`}>Título</label>
            <input id="new-task-title" required placeholder="Nome da tarefa" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={dark ? 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-violet-500/60 transition' : 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 transition'} />
          </div>
          <div>
            <label htmlFor="new-task-desc" className={`text-xs font-semibold ${dark ? 'text-white/65' : 'text-slate-600'} uppercase tracking-widest mb-1.5 block`}>Descrição</label>
            <textarea id="new-task-desc" rows={3} placeholder="Descrição opcional" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className={dark ? 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-violet-500/60 resize-none transition' : 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 resize-none transition'} />
          </div>
          <div>
            <label htmlFor="new-task-priority" className={`text-xs font-semibold ${dark ? 'text-white/65' : 'text-slate-600'} uppercase tracking-widest mb-1.5 block`}>Prioridade</label>
            <select id="new-task-priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as ApiTask['priority'] }))}
              style={{ backgroundColor: dark ? '#0D1117' : undefined }}
              className={dark ? 'w-full bg-[#0D1117] border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-violet-500/60 transition' : 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 outline-none focus:border-violet-400 transition'}>
              <option value="HIGH" style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>Alta</option>
              <option value="MEDIUM" style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>Média</option>
              <option value="LOW" style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>Baixa</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end mt-1">
            <button type="button" onClick={onClose}
              className={`px-4 py-2 rounded-xl text-sm border ${dark ? 'border-white/10 text-white/50 hover:bg-white/5' : 'border-slate-200 text-slate-500 hover:bg-slate-50'} transition`}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50"
              aria-busy={saving}>
              {saving ? 'Salvando...' : 'Criar Tarefa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
