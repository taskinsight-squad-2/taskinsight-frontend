'use client'

import { useEffect, useRef } from 'react'
import { useA11yPrefs } from '@/hooks/useA11yPrefs'
import { speak } from '@/lib/speak'

export function PersonalizeModal({ onClose }: { onClose: () => void }) {
  const { prefs, toggle } = useA11yPrefs()
  const dark = prefs.darkMode
  const panelRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  function handleToggle(key: keyof typeof prefs, label: string) {
    toggle(key)
    const next = !prefs[key]
    if (prefs.speechMode || key === 'speechMode') speak(`${label} ${next ? 'ativado' : 'desativado'}`)
  }

  useEffect(() => {
    panelRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const border    = dark ? 'border-white/8'  : 'border-slate-200'
  const sectLbl   = dark ? 'text-white/55'   : 'text-slate-500'
  const labelCls  = dark ? 'text-white/80'   : 'text-slate-700'
  const title     = dark ? 'text-white'      : 'text-slate-900'
  const bgPanel   = dark ? '#161b22'         : '#ffffff'

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[500] flex items-center justify-center"
      style={{ background: dark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.32)' }}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Personalizar experiência"
        tabIndex={-1}
        className="relative w-full max-w-sm mx-4 rounded-2xl shadow-2xl outline-none overflow-hidden"
        style={{ background: bgPanel }}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${border}`}>
          <div className="flex items-center gap-2.5">
            <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-500">
              <line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/>
              <line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/>
              <line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>
            </svg>
            <h2 className={`text-sm font-semibold ${title}`}>Personalizar experiência</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${dark ? 'text-white/50 hover:bg-white/10 hover:text-white' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 overflow-y-auto max-h-[70vh]">
          <div className={`flex items-start gap-2 mb-4 px-3 py-2.5 rounded-lg border ${dark ? 'bg-violet-500/10 border-violet-500/25 text-violet-300' : 'bg-violet-50 border-violet-200 text-violet-700'}`}>
            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="flex-shrink-0 mt-px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <p className="text-xs font-medium leading-relaxed">Preferências salvas no dispositivo e aplicadas imediatamente.</p>
          </div>

          {/* Visão */}
          <fieldset className="mb-4">
            <legend className={`text-[10px] font-bold uppercase tracking-widest ${sectLbl} mb-2`}>Visão</legend>
            <div className="flex flex-col gap-2">
              {([
                { key: 'highContrast',     label: 'Alto contraste' },
                { key: 'darkMode',         label: 'Modo escuro' },
                { key: 'largeFont',        label: 'Fonte maior' },
                { key: 'reduceMotion',     label: 'Reduzir animações' },
                { key: 'screenReaderMode', label: 'Otimizado para leitor de tela' },
              ] as const).map(({ key, label }) => (
                <label key={key} className={`flex items-center gap-2.5 text-xs cursor-pointer ${labelCls}`}>
                  <input type="checkbox" checked={prefs[key]} onChange={() => handleToggle(key, label)} className="w-3.5 h-3.5 rounded accent-violet-600 cursor-pointer" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Mobilidade */}
          <fieldset className="mb-4">
            <legend className={`text-[10px] font-bold uppercase tracking-widest ${sectLbl} mb-2`}>Mobilidade</legend>
            <div className="flex flex-col gap-2">
              {([
                { key: 'keyboardNav',   label: 'Navegação por teclado avançada' },
                { key: 'largerTargets', label: 'Alvos de clique maiores (44px)' },
              ] as const).map(({ key, label }) => (
                <label key={key} className={`flex items-center gap-2.5 text-xs cursor-pointer ${labelCls}`}>
                  <input type="checkbox" checked={prefs[key]} onChange={() => handleToggle(key, label)} className="w-3.5 h-3.5 rounded accent-violet-600 cursor-pointer" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Cognição / Foco */}
          <fieldset className="mb-4">
            <legend className={`text-[10px] font-bold uppercase tracking-widest ${sectLbl} mb-2`}>Cognição / Foco</legend>
            <div className="flex flex-col gap-2">
              {([
                { key: 'simplifiedUI', label: 'Interface simplificada' },
                { key: 'focusMode',    label: 'Modo foco — menos distrações' },
              ] as const).map(({ key, label }) => (
                <label key={key} className={`flex items-center gap-2.5 text-xs cursor-pointer ${labelCls}`}>
                  <input type="checkbox" checked={prefs[key]} onChange={() => handleToggle(key, label)} className="w-3.5 h-3.5 rounded accent-violet-600 cursor-pointer" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {/* Comunicação */}
          <fieldset>
            <legend className={`text-[10px] font-bold uppercase tracking-widest ${sectLbl} mb-2`}>Comunicação</legend>
            <label className={`flex items-center gap-2.5 text-xs cursor-pointer ${labelCls}`}>
              <input type="checkbox" checked={prefs.speechMode} onChange={() => handleToggle('speechMode', 'Leitura em voz alta')} className="w-3.5 h-3.5 rounded accent-violet-600 cursor-pointer" />
              <span className="flex items-center gap-1.5">
                <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                Leitura em voz alta (áudio)
              </span>
            </label>
          </fieldset>
        </div>

        {/* Footer */}
        <div className={`px-5 py-3 border-t ${border} flex justify-end`}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-md shadow-violet-500/20"
          >
            Concluído
          </button>
        </div>
      </div>
    </div>
  )
}
