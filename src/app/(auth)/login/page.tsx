'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { translations, type Locale } from '@/lib/i18n'

export default function LoginPage() {
  const router = useRouter()
  const [locale, setLocale] = useState<Locale>('pt')
  const t = translations[locale]
  const [darkMode, setDarkMode] = useState(false)
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
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // TODO: consumir API de login
      await new Promise(r => setTimeout(r, 800))
      router.push('/dashboard')
    } catch {
      setError(t.invalidCredentials)
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (registerForm.password !== registerForm.confirm) {
      setError(t.passwordMismatch)
      return
    }
    setLoading(true)
    try {
      // TODO: consumir API de cadastro
      await new Promise(r => setTimeout(r, 800))
      router.push('/dashboard?new=true')
    } catch {
      setError(t.registerError)
    } finally {
      setLoading(false)
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // TODO: consumir API de recuperação de senha
      await new Promise(r => setTimeout(r, 800))
      setSuccess(t.recoveryEmailSent)
      setForgotMode(false)
    } catch {
      setError(t.forgotError)
    } finally {
      setLoading(false)
    }
  }

  function switchTab(tab: 'signin' | 'register') {
    setTab(tab)
    setError('')
    setSuccess('')
    setForgotMode(false)
  }

  const input = 'border rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#7C3AED] transition border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 placeholder-gray-400 dark:placeholder-gray-500'
  const inputFull = `w-full pr-10 ${input}`
  const label = 'text-sm font-semibold text-gray-700 dark:text-gray-300'

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] dark:bg-gray-950 relative transition-colors duration-300">

        {/* Controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <select
            value={locale}
            onChange={e => setLocale(e.target.value as Locale)}
            className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-none outline-none cursor-pointer hover:opacity-80 transition"
          >
            <option value="pt">PT-BR</option>
            <option value="en">EN</option>
          </select>
          <button
            onClick={() => setDarkMode(v => !v)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:opacity-80 transition"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>

        {/* Branding */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-[#7C3AED] flex items-center justify-center shadow-lg mb-3">
            <span className="text-white text-2xl">⚡</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">TaskFlow</h1>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">{t.tagline}</p>
        </div>

        {/* Card */}
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-xl p-8 transition-colors duration-300">

          {/* Tabs */}
          {!forgotMode && (
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6">
              <button
                onClick={() => switchTab('signin')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === 'signin'
                    ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <span>→</span> {t.signIn}
              </button>
              <button
                onClick={() => switchTab('register')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                  tab === 'register'
                    ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              >
                <span>✦</span> {t.createAccount}
              </button>
            </div>
          )}

          {/* Feedback */}
          {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
          {success && <p className="text-green-500 text-sm mb-4 text-center">{success}</p>}

          {/* Forgot Password */}
          {forgotMode && (
            <form onSubmit={handleForgot} className="flex flex-col gap-4">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">{t.recoverPassword}</h2>
              <p className="text-sm text-gray-400 dark:text-gray-500">{t.recoverDescription}</p>
              <div className="flex flex-col gap-1">
                <label className={label}>{t.email}</label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className={input}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm bg-gradient-to-r from-[#7C3AED] to-[#9F67FF] shadow-[0_4px_20px_rgba(124,58,237,0.4)] hover:opacity-90 transition disabled:opacity-60"
              >
                {loading ? t.sending : t.sendRecovery}
              </button>
              <button type="button" onClick={() => setForgotMode(false)} className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-center">
                {t.backToLogin}
              </button>
            </form>
          )}

          {/* Sign In */}
          {!forgotMode && tab === 'signin' && (
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className={label}>{t.email}</label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={loginForm.email}
                  onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                  className={input}
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className={label}>{t.password}</label>
                  <button type="button" onClick={() => setForgotMode(true)} className="text-xs text-[#7C3AED] hover:underline">
                    {t.forgotPassword}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                    className={inputFull}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !loginForm.email || !loginForm.password}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm bg-gradient-to-r from-[#7C3AED] to-[#9F67FF] shadow-[0_4px_20px_rgba(124,58,237,0.4)] hover:opacity-90 transition disabled:opacity-60"
              >
                {loading ? t.signingIn : t.signInButton}
              </button>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
                <span className="text-xs text-gray-400 dark:text-gray-500">{t.demo}</span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
              </div>
            </form>
          )}

          {/* Register */}
          {!forgotMode && tab === 'register' && (
            <form onSubmit={handleRegister} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className={label}>{t.name}</label>
                <input
                  type="text"
                  required
                  placeholder={t.namePlaceholder}
                  value={registerForm.name}
                  onChange={e => setRegisterForm(f => ({ ...f, name: e.target.value }))}
                  className={input}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={label}>{t.email}</label>
                <input
                  type="email"
                  required
                  placeholder="seu@email.com"
                  value={registerForm.email}
                  onChange={e => setRegisterForm(f => ({ ...f, email: e.target.value }))}
                  className={input}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={label}>{t.password}</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={registerForm.password}
                    onChange={e => setRegisterForm(f => ({ ...f, password: e.target.value }))}
                    className={inputFull}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className={label}>{t.confirmPassword}</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={registerForm.confirm}
                    onChange={e => setRegisterForm(f => ({ ...f, confirm: e.target.value }))}
                    className={inputFull}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !registerForm.name || !registerForm.email || !registerForm.password || !registerForm.confirm}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm bg-gradient-to-r from-[#7C3AED] to-[#9F67FF] shadow-[0_4px_20px_rgba(124,58,237,0.4)] hover:opacity-90 transition disabled:opacity-60"
              >
                {loading ? t.creatingAccount : t.createAccountButton}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
