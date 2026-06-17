import { useEffect } from 'react'
import { speak } from '@/lib/speak'

const INTERACTIVE = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="tab"]',
  '[role="checkbox"]',
  '[role="switch"]',
  '[role="radio"]',
  'label',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

function getLabel(el: Element): string {
  const aria = el.getAttribute('aria-label')
  if (aria?.trim()) return aria.trim()

  const labelledBy = el.getAttribute('aria-labelledby')
  if (labelledBy) {
    const text = labelledBy
      .split(/\s+/)
      .map(id => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean)
      .join(' ')
    if (text) return text
  }

  const title = el.getAttribute('title')
  if (title?.trim()) return title.trim()

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const linked = el.id
      ? document.querySelector<HTMLLabelElement>(`label[for="${el.id}"]`)?.textContent?.trim()
      : undefined
    if (linked) return linked
    if (el.placeholder?.trim()) return el.placeholder.trim()
    return ''
  }

  if (el instanceof HTMLImageElement && el.alt?.trim()) return el.alt.trim()

  const own = Array.from(el.childNodes)
    .filter(n => n.nodeType === Node.TEXT_NODE)
    .map(n => n.textContent?.trim())
    .filter(Boolean)
    .join(' ')
    .trim()
  if (own) return own.length > 120 ? own.slice(0, 120) + '…' : own

  const full = el.textContent?.trim() ?? ''
  return full.length > 120 ? full.slice(0, 120) + '…' : full
}

function findSpeakable(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null

  // Gráficos Recharts: o <svg> tem tabIndex=0 e textContent de todas as datas.
  // Nunca processa elementos dentro de SVG por aqui — o chart watcher cuida disso.
  if (target.closest('svg')) return null

  // Sobe até encontrar elemento interativo
  let el: Element | null = target
  while (el) {
    if (el.matches(INTERACTIVE)) return el
    el = el.parentElement
  }

  // Fallback: cards informativos com aria-label (máx 3 níveis — evita section/main)
  let depth = 0
  let info: Element | null = target
  while (info && depth < 3) {
    if (info.hasAttribute('aria-label') && info.getAttribute('aria-label')?.trim()) {
      const tag = info.tagName.toLowerCase()
      if (!['section', 'main', 'header', 'nav', 'aside', 'footer', 'html', 'body'].includes(tag)) {
        return info
      }
    }
    info = info.parentElement
    depth++
  }

  return null
}

// Lê o tooltip ativo do Recharts (div HTML fora do SVG)
function readRechartsTooltip(): string {
  const wrapper = document.querySelector<HTMLElement>('.recharts-tooltip-wrapper')
  if (!wrapper) return ''

  const style = window.getComputedStyle(wrapper)
  if (style.visibility === 'hidden') return ''
  if (parseFloat(style.opacity ?? '1') < 0.05) return ''

  return wrapper.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

export function useSpeechReader(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    let hoverDebounce: ReturnType<typeof setTimeout> | null = null
    let chartInterval: ReturnType<typeof setInterval> | null = null
    let lastTooltip = ''
    let insideChart = false

    function startChartWatcher() {
      if (chartInterval) return
      insideChart = true
      chartInterval = setInterval(() => {
        const text = readRechartsTooltip()
        if (text && text !== lastTooltip) {
          lastTooltip = text
          speak(text)
        }
      }, 200)
    }

    function stopChartWatcher() {
      insideChart = false
      lastTooltip = ''
      if (chartInterval) { clearInterval(chartInterval); chartInterval = null }
    }

    function onMouseOver(e: MouseEvent) {
      const target = e.target as Element

      // Entrou numa área de gráfico: ativa o watcher do tooltip
      if (target.closest('svg')) {
        if (!insideChart) startChartWatcher()
        if (hoverDebounce) clearTimeout(hoverDebounce)
        return
      }

      // Saiu do gráfico: desativa o watcher
      if (insideChart) {
        stopChartWatcher()
        window.speechSynthesis?.cancel()
      }

      // Elemento normal: fala com debounce
      if (hoverDebounce) clearTimeout(hoverDebounce)
      hoverDebounce = setTimeout(() => {
        const el = findSpeakable(target)
        if (!el) return
        const text = getLabel(el)
        if (text) speak(text)
      }, 500)
    }

    function onFocus(e: FocusEvent) {
      const el = findSpeakable(e.target)
      if (!el) return
      const text = getLabel(el)
      if (text) speak(text)
    }

    function onMouseLeave() {
      stopChartWatcher()
      if (hoverDebounce) clearTimeout(hoverDebounce)
      window.speechSynthesis?.cancel()
    }

    document.addEventListener('mouseover', onMouseOver)
    document.addEventListener('focus', onFocus, true)
    document.addEventListener('mouseleave', onMouseLeave)

    return () => {
      stopChartWatcher()
      if (hoverDebounce) clearTimeout(hoverDebounce)
      window.speechSynthesis?.cancel()
      document.removeEventListener('mouseover', onMouseOver)
      document.removeEventListener('focus', onFocus, true)
      document.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [enabled])
}
