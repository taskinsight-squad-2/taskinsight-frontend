'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    VLibras?: { Widget: new (url: string) => void }
    _vlibrasReady?: boolean
    _vlibrasScriptInjected?: boolean
  }
}

export default function VLibras() {
  useEffect(() => {
    // Já inicializado — nada a fazer
    if (window._vlibrasReady) return

    // Garante estrutura DOM no body (idempotente)
    if (!document.querySelector('[vw]')) {
      const root = document.createElement('div')
      root.setAttribute('vw', '')
      root.className = 'enabled'

      const btn = document.createElement('div')
      btn.setAttribute('vw-access-button', '')
      btn.className = 'active'
      root.appendChild(btn)

      const panel = document.createElement('div')
      panel.setAttribute('vw-plugin-wrapper', '')
      const inner = document.createElement('div')
      inner.className = 'vw-plugin-top-wrapper'
      panel.appendChild(inner)
      root.appendChild(panel)

      document.body.appendChild(root)
    }

    // Se o script já carregou, inicializa direto
    if (window.VLibras) {
      new window.VLibras.Widget('https://vlibras.gov.br/app')
      window._vlibrasReady = true
      return
    }

    // Injeta o script uma única vez
    if (window._vlibrasScriptInjected) return
    window._vlibrasScriptInjected = true

    const script = document.createElement('script')
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js'
    script.async = true
    script.onload = () => {
      if (window.VLibras && !window._vlibrasReady) {
        new window.VLibras.Widget('https://vlibras.gov.br/app')
        window._vlibrasReady = true
      }
    }
    script.onerror = () => console.error('[VLibras] falha ao carregar vlibras-plugin.js')
    document.body.appendChild(script)
  }, [])

  return null
}
