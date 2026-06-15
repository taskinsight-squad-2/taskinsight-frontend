'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { authService } from '@/services/auth.service'
import { useA11yPrefs } from '@/hooks/useA11yPrefs'
import { translations } from '@/lib/i18n'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const { prefs } = useA11yPrefs()
  const dark = prefs.darkMode
  const t = translations['pt']

  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [done, setDone]             = useState(false)

  const bg        = dark ? 'bg-[#080B14]'      : 'bg-[#F4F6FB]'
  const cardBg    = dark ? 'bg-[#0D1117]'      : 'bg-white'
  const cardBdr   = dark ? 'border-white/8'    : 'border-slate-200'
  const text      = dark ? 'text-white'        : 'text-slate-900'
  const textMuted = dark ? 'text-white/55'     : 'text-slate-500'
  const labelCls  = `text-xs font-semibold ${dark ? 'text-white/65' : 'text-slate-600'} uppercase tracking-widest mb-1.5 block`
  const inputCls  = dark
    ? 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-violet-500/60 focus:bg-violet-500/5 transition-all'
    : 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 focus:bg-violet-50/50 transition-all'
  const eyeBtn    = dark ? 'text-white/45 hover:text-white/70' : 'text-slate-400 hover:text-slate-600'
  const backBtn   = dark ? 'text-white/50 hover:text-white/75' : 'text-slate-500 hover:text-slate-700'

  if (!token) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${bg} ${text}`}>
        <div className={`${cardBg} border ${cardBdr} rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-xl`}>
          <p className="text-red-400 text-sm mb-4">Link inválido ou expirado. Solicite uma nova redefinição de senha.</p>
          <button onClick={() => router.push('/login')}
            className="text-xs text-violet-500 hover:text-violet-400 transition">
            ← Voltar ao login
          </button>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError(t.errPasswordShort); return }
    if (password !== confirm) { setError(t.passwordMismatch); return }
    setLoading(true)
    try {
      await authService.resetPassword(token, password)
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`min-h-screen flex items-center justify-center ${bg} ${text}`}>
      <div className="w-full max-w-sm mx-4">

        {/* logo */}
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/40">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <span className="font-black text-xl tracking-tight">TaskFlow</span>
        </div>

        <div className={`${cardBg} border ${cardBdr} rounded-2xl p-8 shadow-xl transition-colors duration-300`}>
          {done ? (
            <div className="text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <h1 className="text-lg font-bold">Senha redefinida!</h1>
              <p className={`text-sm ${textMuted}`}>Redirecionando para o login...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
              <div>
                <h1 className="text-xl font-bold">Redefinir senha</h1>
                <p className={`text-sm ${textMuted} mt-1`}>Digite sua nova senha abaixo.</p>
              </div>

              {error && (
                <div role="alert" className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <span aria-hidden className="text-red-500 text-xs">⚠</span>
                  <p className="text-red-500 text-xs">{error}</p>
                </div>
              )}

              <div>
                <label className={labelCls}>Nova senha</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className={inputCls}
                    required
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${eyeBtn} transition`}>
                    <span aria-hidden>{showPass ? '🙈' : '👁'}</span>
                  </button>
                </div>
                <p className={`text-[11px] mt-1 ${dark ? 'text-white/35' : 'text-slate-400'}`}>{t.passwordHint}</p>
              </div>

              <div>
                <label className={labelCls}>Confirmar nova senha</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className={inputCls}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Redefinindo...' : 'Redefinir senha'}
              </button>

              <button type="button" onClick={() => router.push('/login')}
                className={`text-xs text-center ${backBtn} transition`}>
                ← Voltar ao login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
