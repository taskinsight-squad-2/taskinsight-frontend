'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { authService } from '@/services/auth.service'

type Status = 'loading' | 'success' | 'error'

function ConfirmEmailContent() {
  const params = useSearchParams()
  const router = useRouter()
  const [status, setStatus] = useState<Status>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setStatus('error')
      setMessage('Link de confirmação inválido.')
      return
    }

    authService.confirmEmail(token)
      .then(() => {
        setStatus('success')
        setMessage('Email confirmado com sucesso! Você já pode fazer login.')
      })
      .catch((err: Error) => {
        setStatus('error')
        setMessage(err.message || 'Link inválido ou já utilizado.')
      })
  }, [params])

  const icon = status === 'loading' ? '⏳' : status === 'success' ? '✅' : '❌'
  const color = status === 'loading'
    ? 'text-violet-400'
    : status === 'success'
      ? 'text-emerald-400'
      : 'text-red-400'

  return (
    <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-8 space-y-4">
      <div className="text-4xl">{icon}</div>
      <p className={`text-sm font-medium ${color}`}>{message || 'Verificando seu link...'}</p>

      {status !== 'loading' && (
        <button
          onClick={() => router.push('/login')}
          className="mt-2 w-full bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold py-3 rounded-xl transition-colors"
        >
          Ir para o login
        </button>
      )}
    </div>
  )
}

export default function ConfirmEmailPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#080B14] px-4">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-2xl">⚡</span>
          <span className="text-xl font-bold text-white">TaskFlow</span>
        </div>

        <Suspense fallback={
          <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-8">
            <p className="text-sm text-violet-400">⏳ Verificando seu link...</p>
          </div>
        }>
          <ConfirmEmailContent />
        </Suspense>

        <p className="text-xs text-white/30">
          &copy; {new Date().getFullYear()} TaskFlow
        </p>
      </div>
    </main>
  )
}
