'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { translations, type Locale } from '@/lib/i18n'
import { authService } from '@/services/auth.service'
import { useA11yPrefs } from '@/hooks/useA11yPrefs'

export default function LoginPage() {
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>('pt')
  const t = translations[locale]
  const { prefs, toggle } = useA11yPrefs()
  const [showA11y, setShowA11y] = useState(false)
  const [a11yAnnounce, setA11yAnnounce] = useState('')
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // dark mode vem das preferências de acessibilidade
  const dark = prefs.darkMode

  function togglePref(key: Parameters<typeof toggle>[0], label: string) {
    toggle(key)
    const next = !prefs[key]
    if (announceTimer.current) clearTimeout(announceTimer.current)
    setA11yAnnounce(`${label}: ${next ? 'ativado' : 'desativado'}`)
    announceTimer.current = setTimeout(() => setA11yAnnounce(''), 2000)
  }
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  function fe(key: string, msg: string) { setFieldErrors(p => ({ ...p, [key]: msg })) }
  function clearFe(key: string) { setFieldErrors(p => { const n = { ...p }; delete n[key]; return n }) }

  function validateEmail(val: string, key = 'email') {
    if (!val.trim()) { fe(key, t.errEmailRequired); return false }
    if (!emailRe.test(val.trim())) { fe(key, t.errEmailInvalid); return false }
    clearFe(key); return true
  }
  function validatePassword(val: string, key = 'password') {
    if (!val) { fe(key, t.errPasswordRequired); return false }
    if (val.length < 6) { fe(key, t.errPasswordShort); return false }
    clearFe(key); return true
  }
  function validateName(val: string) {
    if (!val.trim()) { fe('name', t.errNameRequired); return false }
    if (val.trim().length < 2) { fe('name', t.errNameShort); return false }
    clearFe('name'); return true
  }
  function validateConfirm(val: string, password: string) {
    if (!val) { fe('confirm', t.errConfirmRequired); return false }
    if (val !== password) { fe('confirm', t.passwordMismatch); return false }
    clearFe('confirm'); return true
  }

  function friendlyApiError(msg: string, fallback: string) {
    if (msg.toLowerCase().includes('credenciais') || msg.toLowerCase().includes('invalid'))
      return t.invalidCredentials
    if (msg.toLowerCase().includes('já cadastrado') || msg.toLowerCase().includes('already'))
      return t.emailAlreadyExists
    if (msg.toLowerCase().includes('não cadastrado') || msg.toLowerCase().includes('not registered'))
      return t.emailNotRegistered
    return fallback
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault(); setError('')
    const ok = validateEmail(loginForm.email) & validatePassword(loginForm.password) as unknown as boolean
    if (!ok) return
    setLoading(true)
    try {
      const data = await authService.login(loginForm.email, loginForm.password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/dashboard')
    }
    catch (err: any) { setError(friendlyApiError(err.message ?? '', t.invalidCredentials)) }
    finally { setLoading(false) }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault(); setError('')
    const ok = [
      validateName(registerForm.name),
      validateEmail(registerForm.email, 'regEmail'),
      validatePassword(registerForm.password, 'regPassword'),
      validateConfirm(registerForm.confirm, registerForm.password),
    ].every(Boolean)
    if (!ok) return
    setLoading(true)
    try {
      const data = await authService.register(registerForm.name, registerForm.email, registerForm.password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/dashboard?new=true')
    }
    catch (err: any) { setError(friendlyApiError(err.message ?? '', t.registerError)) }
    finally { setLoading(false) }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (!validateEmail(forgotEmail, 'forgotEmail')) return
    setLoading(true)
    try {
      await authService.forgotPassword(forgotEmail)
      setSuccess(t.recoveryEmailSent)
      setForgotMode(false)
    }
    catch (err: any) { setError(friendlyApiError(err.message ?? '', t.forgotError)) }
    finally { setLoading(false) }
  }

  function switchTab(key: 'signin' | 'register') {
    setTab(key); setError(''); setSuccess(''); setForgotMode(false); setFieldErrors({})
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

  function inputClsWith(errKey: string) {
    return fieldErrors[errKey]
      ? (dark
        ? 'w-full bg-white/5 border border-red-500/70 rounded-xl px-4 py-3 text-sm text-white placeholder-white/40 outline-none focus:border-red-500 focus:bg-red-500/5 transition-all'
        : 'w-full bg-slate-50 border border-red-400 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-red-500 focus:bg-red-50/50 transition-all')
      : inputCls
  }

  function FieldError({ errKey }: { errKey: string }) {
    if (!fieldErrors[errKey]) return null
    return (
      <p id={`err-${errKey}`} role="alert" className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
        <span aria-hidden="true">⚠</span>
        {fieldErrors[errKey]}
      </p>
    )
  }

  return (
    <div className={`min-h-screen flex ${bg} ${text} overflow-hidden transition-colors duration-300`}>
      {/* Região de anúncio para leitores de tela */}
      <div role="status" aria-live="assertive" aria-atomic="true" className="sr-only">
        {a11yAnnounce}
      </div>

      {/* ── Left panel: branding (decorativo, oculto de leitores de tela) ── */}
      <div aria-hidden="true" className={`hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 relative px-10 py-10 border-r ${divider} ${panelBg} transition-colors duration-300`}>
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
          <label htmlFor="lang-select" className="sr-only">Idioma</label>
          <select
            id="lang-select"
            value={locale}
            onChange={e => setLocale(e.target.value as Locale)}
            className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${ctrlBg} outline-none cursor-pointer hover:opacity-80 transition`}
            style={{ backgroundColor: dark ? '#0D1117' : undefined }}
          >
            <option value="pt" style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>PT-BR</option>
            <option value="en" style={{ backgroundColor: dark ? '#0D1117' : 'white' }}>EN</option>
          </select>
          <button
            onClick={() => togglePref('darkMode', 'Modo escuro')}
            aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
            aria-pressed={dark}
            className={`w-8 h-8 flex items-center justify-center rounded-lg border ${ctrlBg} hover:opacity-80 transition text-sm`}
          >
            <span aria-hidden="true">{dark ? '☀️' : '🌙'}</span>
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

            <div aria-live="polite" aria-atomic="true">
              {error && (
                <div role="alert" className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
                  <span aria-hidden="true" className="text-red-500 text-xs">⚠</span>
                  <p className="text-red-500 text-xs">{error}</p>
                </div>
              )}
              {success && (
                <div role="status" className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-4">
                  <span aria-hidden="true" className="text-emerald-600 text-xs">✓</span>
                  <p className="text-emerald-600 text-xs">{success}</p>
                </div>
              )}
            </div>

            {/* Forgot */}
            {forgotMode && (
              <form onSubmit={handleForgot} className="flex flex-col gap-5">
                <div>
                  <h1 className="text-xl font-bold">{t.recoverPassword}</h1>
                  <p className={`text-sm ${textMuted} mt-1`}>{t.recoverDescription}</p>
                </div>
                <div>
                  <label className={labelCls}>{t.email}</label>
                  <input
                    type="email" placeholder="seu@email.com" value={forgotEmail}
                    onChange={e => { setForgotEmail(e.target.value); clearFe('forgotEmail') }}
                    onBlur={() => validateEmail(forgotEmail, 'forgotEmail')}
                    className={inputClsWith('forgotEmail')}
                  />
                  <FieldError errKey="forgotEmail" />
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
              <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate aria-label="Formulário de login">
                <div>
                  <label htmlFor="login-email" className={labelCls}>{t.email}</label>
                  <input
                    id="login-email" type="email" autoComplete="email"
                    placeholder="seu@email.com" value={loginForm.email}
                    onChange={e => { setLoginForm(f => ({ ...f, email: e.target.value })); clearFe('email') }}
                    onBlur={() => validateEmail(loginForm.email)}
                    aria-describedby={fieldErrors.email ? 'err-email' : undefined}
                    aria-invalid={!!fieldErrors.email}
                    className={inputClsWith('email')}
                  />
                  <FieldError errKey="email" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="login-password" className={`text-xs font-semibold ${label} uppercase tracking-widest`}>{t.password}</label>
                    <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-violet-500 hover:text-violet-400 transition">
                      {t.forgotPassword}
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="login-password" type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password" placeholder="••••••••" value={loginForm.password}
                      onChange={e => { setLoginForm(f => ({ ...f, password: e.target.value })); clearFe('password') }}
                      onBlur={() => validatePassword(loginForm.password)}
                      aria-describedby={fieldErrors.password ? 'err-password' : undefined}
                      aria-invalid={!!fieldErrors.password}
                      className={inputClsWith('password')}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      aria-pressed={showPassword}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${eyeBtn} transition text-xs`}>
                      <span aria-hidden="true">{showPassword ? '🙈' : '👁'}</span>
                    </button>
                  </div>
                  <FieldError errKey="password" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full mt-1 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span aria-hidden="true" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t.signingIn}</span>
                    </span>
                  ) : t.signInButton}
                </button>
              </form>
            )}

            {/* Register */}
            {!forgotMode && tab === 'register' && (
              <form onSubmit={handleRegister} className="flex flex-col gap-4" noValidate aria-label="Formulário de cadastro">
                <div>
                  <label htmlFor="reg-name" className={labelCls}>{t.name}</label>
                  <input
                    id="reg-name" type="text" autoComplete="name"
                    placeholder={t.namePlaceholder} value={registerForm.name}
                    onChange={e => { setRegisterForm(f => ({ ...f, name: e.target.value })); clearFe('name') }}
                    onBlur={() => validateName(registerForm.name)}
                    aria-describedby={fieldErrors.name ? 'err-name' : undefined}
                    aria-invalid={!!fieldErrors.name}
                    className={inputClsWith('name')}
                  />
                  <FieldError errKey="name" />
                </div>
                <div>
                  <label htmlFor="reg-email" className={labelCls}>{t.email}</label>
                  <input
                    id="reg-email" type="email" autoComplete="email"
                    placeholder="seu@email.com" value={registerForm.email}
                    onChange={e => { setRegisterForm(f => ({ ...f, email: e.target.value })); clearFe('regEmail') }}
                    onBlur={() => validateEmail(registerForm.email, 'regEmail')}
                    aria-describedby={fieldErrors.regEmail ? 'err-regEmail' : undefined}
                    aria-invalid={!!fieldErrors.regEmail}
                    className={inputClsWith('regEmail')}
                  />
                  <FieldError errKey="regEmail" />
                </div>
                <div>
                  <label htmlFor="reg-password" className={labelCls}>{t.password}</label>
                  <div className="relative">
                    <input
                      id="reg-password" type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password" placeholder="••••••••" value={registerForm.password}
                      onChange={e => { setRegisterForm(f => ({ ...f, password: e.target.value })); clearFe('regPassword') }}
                      onBlur={() => validatePassword(registerForm.password, 'regPassword')}
                      aria-describedby={fieldErrors.regPassword ? 'err-regPassword' : 'pw-hint'}
                      aria-invalid={!!fieldErrors.regPassword}
                      className={inputClsWith('regPassword')}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                      aria-pressed={showPassword}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${eyeBtn} transition text-xs`}>
                      <span aria-hidden="true">{showPassword ? '🙈' : '👁'}</span>
                    </button>
                  </div>
                  <p id="pw-hint" className={`text-[11px] mt-1 ${dark ? 'text-white/35' : 'text-slate-400'}`}>Mínimo de 6 caracteres.</p>
                  <FieldError errKey="regPassword" />
                </div>
                <div>
                  <label htmlFor="reg-confirm" className={labelCls}>{t.confirmPassword}</label>
                  <div className="relative">
                    <input
                      id="reg-confirm" type={showConfirm ? 'text' : 'password'}
                      autoComplete="new-password" placeholder="••••••••" value={registerForm.confirm}
                      onChange={e => { setRegisterForm(f => ({ ...f, confirm: e.target.value })); clearFe('confirm') }}
                      onBlur={() => validateConfirm(registerForm.confirm, registerForm.password)}
                      aria-describedby={fieldErrors.confirm ? 'err-confirm' : undefined}
                      aria-invalid={!!fieldErrors.confirm}
                      className={inputClsWith('confirm')}
                    />
                    <button type="button" onClick={() => setShowConfirm(v => !v)}
                      aria-label={showConfirm ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'}
                      aria-pressed={showConfirm}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 ${eyeBtn} transition text-xs`}>
                      <span aria-hidden="true">{showConfirm ? '🙈' : '👁'}</span>
                    </button>
                  </div>
                  <FieldError errKey="confirm" />
                </div>
                {/* Painel de preferências de acessibilidade */}
                <div className={`rounded-xl border ${dark ? 'border-white/8 bg-white/[0.02]' : 'border-slate-200 bg-slate-50'} overflow-hidden`}>
                  <button
                    type="button"
                    onClick={() => setShowA11y(v => !v)}
                    aria-expanded={showA11y}
                    aria-controls="a11y-prefs-panel"
                    className={`w-full flex items-center justify-between px-4 py-3 text-left text-xs font-semibold ${dark ? 'text-white/65 hover:text-white/85' : 'text-slate-600 hover:text-slate-800'} transition`}
                  >
                    <span className="flex items-center gap-2">
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                      Personalizar experiência <span className={`text-[10px] font-normal ${dark ? 'text-white/35' : 'text-slate-400'}`}>(opcional)</span>
                    </span>
                    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ transform: showA11y ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .2s' }}>
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>

                  {showA11y && (
                    <div id="a11y-prefs-panel" className={`px-4 pb-4 border-t ${dark ? 'border-white/8' : 'border-slate-200'}`}>
                      <div className={`flex items-start gap-2 mt-3 mb-3 px-3 py-2.5 rounded-lg border ${dark ? 'bg-violet-500/10 border-violet-500/25 text-violet-300' : 'bg-violet-50 border-violet-200 text-violet-700'}`}>
                        <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-px">
                          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                        </svg>
                        <p className="text-xs font-medium leading-relaxed">
                          Estas preferências são salvas no seu dispositivo e podem ser alteradas a qualquer momento.
                        </p>
                      </div>

                      {/* Visão */}
                      <fieldset className="mb-3">
                        <legend className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-white/55' : 'text-slate-500'} mb-2`}>Visão</legend>
                        <div className="flex flex-col gap-1.5">
                          {([
                            { key: 'highContrast',     label: 'Alto contraste' },
                            { key: 'darkMode',         label: 'Modo escuro' },
                            { key: 'largeFont',        label: 'Fonte maior' },
                            { key: 'reduceMotion',     label: 'Reduzir animações' },
                            { key: 'screenReaderMode', label: 'Otimizado para leitor de tela' },
                          ] as const).map(({ key, label }) => (
                            <label key={key} className={`flex items-center gap-2.5 text-xs cursor-pointer ${dark ? 'text-white/80' : 'text-slate-700'}`}>
                              <input type="checkbox" checked={prefs[key]}
                                onChange={() => togglePref(key, label)}
                                className="w-3.5 h-3.5 rounded accent-violet-600 cursor-pointer" />
                              {label}
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      {/* Mobilidade */}
                      <fieldset className="mb-3">
                        <legend className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-white/55' : 'text-slate-500'} mb-2`}>Mobilidade</legend>
                        <div className="flex flex-col gap-1.5">
                          {([
                            { key: 'keyboardNav',    label: 'Navegação por teclado avançada' },
                            { key: 'largerTargets',  label: 'Alvos de clique maiores (44px)' },
                          ] as const).map(({ key, label }) => (
                            <label key={key} className={`flex items-center gap-2.5 text-xs cursor-pointer ${dark ? 'text-white/80' : 'text-slate-700'}`}>
                              <input type="checkbox" checked={prefs[key]}
                                onChange={() => togglePref(key, label)}
                                className="w-3.5 h-3.5 rounded accent-violet-600 cursor-pointer" />
                              {label}
                            </label>
                          ))}
                        </div>
                      </fieldset>

                      {/* Cognição / Foco */}
                      <fieldset>
                        <legend className={`text-[10px] font-bold uppercase tracking-widest ${dark ? 'text-white/55' : 'text-slate-500'} mb-2`}>Cognição / Foco</legend>
                        <div className="flex flex-col gap-1.5">
                          {([
                            { key: 'simplifiedUI', label: 'Interface simplificada' },
                            { key: 'focusMode',    label: 'Modo foco — menos distrações' },
                          ] as const).map(({ key, label }) => (
                            <label key={key} className={`flex items-center gap-2.5 text-xs cursor-pointer ${dark ? 'text-white/80' : 'text-slate-700'}`}>
                              <input type="checkbox" checked={prefs[key]}
                                onChange={() => togglePref(key, label)}
                                className="w-3.5 h-3.5 rounded accent-violet-600 cursor-pointer" />
                              {label}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/25 disabled:opacity-40 disabled:cursor-not-allowed">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span aria-hidden="true" className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t.creatingAccount}</span>
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
