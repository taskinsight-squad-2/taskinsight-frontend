'use client'

import { useEffect } from 'react'

declare global {
  interface Window { VLibras?: { Widget: new (url: string) => void } }
}

export function triggerVLibras() {
  document.querySelector<HTMLElement>('[vw-access-button]')?.click()
}

export default function VLibras() {
  useEffect(() => {
    // Container already in DOM — skip
    if (document.querySelector('[vw]')) {
      // Script may have loaded after the container — ensure widget is running
      if (window.VLibras) new window.VLibras.Widget('https://vlibras.gov.br/app')
      return
    }

    // 1. Create the VLibras HTML container
    const div = document.createElement('div')
    div.setAttribute('vw', '')
    div.className = 'enabled'
    div.innerHTML = `
      <div vw-access-button class="active"></div>
      <div vw-plugin-wrapper>
        <div class="vw-plugin-top-wrapper"></div>
      </div>
    `
    document.body.appendChild(div)

    // 2. Inject the VLibras script directly (bypasses Next.js/Turbopack)
    const script = document.createElement('script')
    script.src = 'https://vlibras.gov.br/app/vlibras-plugin.js'
    script.async = true
    script.onload = () => {
      if (window.VLibras) new window.VLibras.Widget('https://vlibras.gov.br/app')
    }
    document.body.appendChild(script)

    // No cleanup — container must persist after VLibras initialises
  }, [])

  return null
}
