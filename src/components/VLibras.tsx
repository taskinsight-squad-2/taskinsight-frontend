'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    VLibras?: { Widget: new (url: string) => void }
  }
}

export default function VLibras() {
  useEffect(() => {
    if (document.querySelector('#vlibras-root')) return

    const root = document.createElement('div')
    root.id = 'vlibras-root'
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

    const script = document.createElement('script')
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js'
    script.onload = () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const V = window.VLibras as any
        const Widget = V?.Widget ?? V?.default?.Widget
        if (Widget) new Widget('https://vlibras.gov.br/app')
      } catch (e) {
        console.error('[VLibras] erro ao inicializar:', e)
      }
    }
    script.onerror = () => console.error('[VLibras] script não carregou')
    document.body.appendChild(script)
  }, [])

  return null
}
