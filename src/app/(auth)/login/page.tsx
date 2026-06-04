'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { translations, type Locale } from '@/lib/i18n'
import { authService } from '@/services/auth.service'

export default function LoginPage() {
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>('pt')
  const t = translations[locale]
  const [dark, setDark] = useState(false)
  const [tab, setTab] = useState<'signin' | 'register'>('signin')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [forgotEmail, setForgotEmail] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const data = await authService.login(loginForm.email, loginForm.password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/dashboard')
    }
    catch (err: any) { setError(err.message || t.invalidCredentials) }
    finally { setLoading(false) }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (registerForm.password !== registerForm.confirm) { setError(t.passwordMismatch); return }
    setLoading(true)
    try {
      const data = await authService.register(registerForm.name, registerForm.email, registerForm.password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/dashboard?new=true')
    }
    catch (err: any) { setError(err.message || t.registerError) }
    finally { setLoading(false) }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try { await new Promise(r => setTimeout(r, 800)); setSuccess(t.recoveryEmailSent); setForgotMode(false) }
    catch { setError(t.forgotError) }
    finally { setLoading(false) }
  }

  function switchTab(key: 'signin' | 'register') {
    setTab(key); setError(''); setSuccess(''); setForgotMode(false)
  }

  // ── tokens por tema ──────────────────────────────────────────────
  const bg        = dark ? 'bg-[#080B14]'          : 'bg-[#F4F6FB]'
  const panelBg   = dark ? 'bg-[#0D1117]'          : 'bg-white'
  const cardBg    = dark ? 'bg-white/[0.03]'        : 'bg-white'
  const cardBorder= dark ? 'border-white/8'         : 'border-slate-200'
  const cardGlow  = dark ? 'from-violet-500/20'     : 'from-violet-300/30'
  const text      = dark ? 'text-white'             : 'text-slate-900'
  const textMuted = dark ? 'text-white/55'          : 'text-slate-500'
  const textFaint = dark ? 'text-white/40'          : 'text-slate-400'
  const label     = dark ? 'text-white/65'          : 'text-slate-600'
  const divider   = dark ? 'border-white/5'         : 'border-slate-200'
  const tabBg     = dark ? 'bg-white/5 border-white/8'   : 'bg-slate-100 border-slate-200'
  const tabInact  = dark ? 'text-white/55 hover:text-white/80' : 'text-slate-500 hover:text-slate-800'
  const inputCls  = dark
    ? 'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-violet-500/60 focus:bg-violet-500/5 transition-all'
    : 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-violet-400 focus:bg-violet-50/50 transition-all'
  const ctrlBg    = dark ? 'bg-white/5 border-white/10 text-white/65' : 'bg-white border-slate-200 text-slate-600'
  const eyeBtn    = dark ? 'text-white/45 hover:text-white/70' : 'text-slate-400 hover:text-slate-600'
  const backBtn   = dark ? 'text-white/50 hover:text-white/75' : 'text-slate-500 hover:text-slate-700'
  const featureItem = dark ? 'text-white/65' : 'text-slate-600'
  const featureIcon = dark ? 'bg-white/5 border-white/8' : 'bg-violet-50 border-violet-100'

  const labelCls = `text-xs font-semibold ${label} uppercase tracking-widest mb-1.5 block`

  return (
    <div className={`min-h-screen flex ${bg} ${text} overflow-hidden transition-colors duration-300`}>

      {/* ── Left panel: branding ── */}
      <div className={`hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 relative px-10 py-10 border-r ${divider} ${panelBg} transition-colors duration-300`}>
        {dark && <>
          <div className="absolute inset-0 bg-gradient-to-br from-violet-950/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        </>}
        {!dark && <>
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50/80 via-transparent to-indigo-50/40 pointer-events-none" />
          <div className="absolute -top-20 -left-20 w-72 h-72 bg-violet-200/40 rounded-full blur-3xl pointer-events-none" />
        </>}

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span className="font-bold text-lg tracking-tight">TaskFlow</span>
        </div>

        {/* Center content */}
        <div className="relative flex flex-col gap-8">
          <div>
            <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
              Gerencie tarefas<br />
              <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">com precisão.</span>
            </h2>
            <p className={`mt-3 text-sm ${textMuted} leading-relaxed`}>
              Organize, priorize e entregue. Visibilidade total do seu fluxo de trabalho em um só lugar.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {[
              { icon: '⚡', text: 'Atualizações em tempo real' },
              { icon: '🎯', text: 'Prioridades inteligentes' },
              { icon: '📊', text: 'Analytics de produtividade' },
            ].map(item => (
              <div key={item.text} className={`flex items-center gap-3 text-sm ${featureItem}`}>
                <span className={`w-7 h-7 rounded-lg ${featureIcon} border flex items-center justify-center text-xs flex-shrink-0`}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
        </div>

        <p className={`relative text-xs ${textFaint}`}>© 2025 TaskFlow. All rights reserved.</p>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex flex-col items-center justify-center relative px-6 py-10">

        {dark && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-3xl pointer-events-none" />}

        {/* Controls */}
        <div className="absolute top-5 right-5 flex items-center gap-2">
          <select
            value={locale}
            onChange={e => setLocale(e.target.value as Locale)}
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${ctrlBg} outline-none cursor-pointer hover:opacity-80 transition`}
            style={{ backgroundColor: dark ? '#0D1117' : undefined }}
          >
            <option value="pt" style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>PT-BR</option>
            <option value="en" style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>EN</option>
          </select>
          <button
            onClick={() => setDark(v => !v)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg border ${ctrlBg} hover:opacity-80 transition text-sm`}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span className="font-bold text-lg">TaskFlow</span>
        </div>

        {/* Card */}
        <div className="relative w-full max-w-sm">
          <div className={`absolute -inset-px rounded-2xl bg-gradient-to-b ${cardGlow} to-transparent pointer-events-none`} />
          <div className={`relative ${cardBg} border ${cardBorder} backdrop-blur-xl rounded-2xl p-8 shadow-xl transition-colors duration-300`}>

            {!forgotMode && (
              <div className="mb-7">
                <h1 className="text-xl font-bold tracking-tight">
                  {tab === 'signin' ? 'Entrar na conta' : 'Criar conta'}
                </h1>
                <p className={`text-sm ${textMuted} mt-1`}>
                  {tab === 'signin' ? 'Acesse seu workspace' : 'Comece gratuitamente hoje'}
                </p>
              </div>
            )}

            {/* Tabs */}
            {!forgotMode && (
              <div className={`flex ${tabBg} border rounded-xl p-1 mb-6 gap-1`}>
                {(['signin', 'register'] as const).map(key => (
                  <button
                    key={key}
                    onClick={() => switchTab(key)}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                      tab === key
                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/30'
                        : tabInact
                    }`}
                  >
                    {key === 'signin' ? t.signIn : t.createAccount}
                  </button>
                ))}
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
                <span className="text-red-500 text-xs">⚠</span>
                <p className="text-red-500 text-xs">{error}</p>
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-4">
                <span className="text-emerald-600 text-xs">✓</span>
                <p className="text-emerald-600 text-xs">{success}</p>
              </div>
            )}

            {/* Forgot */}
            {forgotMode && (
              <form onSubmit={handleForgot} className="flex flex-col gap-5">
                <div>
                  <h1 className="text-xl font-bold">{t.recoverPassword}</h1>
                  <p className={`text-sm ${textMuted} mt-1`}>{t.recoverDescription}</p>
                </div>
                <div>
                  <label className={labelCls}>{t.email}</label>
                  <input type="email" required placeholder="seu@email.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className={inputCls} />
                </div>
                <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-50">
                  {loading ? t.sending : t.sendRecovery}
                </button>
                <button type="button" onClick={() => setForgotMode(false)} className={`text-xs ${backBtn} text-center transition`}>
                  ← {t.backToLogin}
                </button>
              </form>
            )}

            {/* Sign In */}
            {!forgotMode && tab === 'signin' && (
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <div>
                  <label className={labelCls}>{t.email}</label>
                  <input type="email" required placeholder="seu@email.com" value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className={`text-xs font-semibold ${label} uppercase tracking-widest`}>{t.password}</label>
                    <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-violet-500 hover:text-violet-400 transition">
                      {t.forgotPassword}
                    </button>
                  </div>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))} className={inputCls} />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${eyeBtn} transition text-xs`}>
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading || !loginForm.email || !loginForm.password}
                  className="w-full mt-1 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t.signingIn}
                    </span>
                  ) : t.signInButton}
                </button>
              </form>
            )}

            {/* Register */}
            {!forgotMode && tab === 'register' && (
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <div>
                  <label className={labelCls}>{t.name}</label>
                  <input type="text" required placeholder={t.namePlaceholder} value={registerForm.name} onChange={e => setRegisterForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t.email}</label>
                  <input type="email" required placeholder="seu@email.com" value={registerForm.email} onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t.password}</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} required placeholder="••••••••" value={registerForm.password} onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))} className={inputCls} />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${eyeBtn} transition text-xs`}>
                      {showPassword ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>{t.confirmPassword}</label>
                  <div className="relative">
                    <input type={showConfirm ? 'text' : 'password'} required placeholder="••••••••" value={registerForm.confirm} onChange={e => setRegisterForm(f => ({ ...f, confirm: e.target.value }))} className={inputCls} />
                    <button type="button" onClick={() => setShowConfirm(v => !v)} className={`absolute right-3 top-1/2 -translate-y-1/2 ${eyeBtn} transition text-xs`}>
                      {showConfirm ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loading || !registerForm.name || !registerForm.email || !registerForm.password || !registerForm.confirm}
                  className="w-full mt-1 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t.creatingAccount}
                    </span>
                  ) : t.createAccountButton}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
