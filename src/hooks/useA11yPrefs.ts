import { useState, useEffect } from 'react'

export interface A11yPrefs {
  darkMode:          boolean
  highContrast:      boolean
  largeFont:         boolean
  reduceMotion:      boolean
  screenReaderMode:  boolean
  keyboardNav:       boolean
  largerTargets:     boolean
  simplifiedUI:      boolean
  focusMode:         boolean
}

const DEFAULTS: A11yPrefs = {
  darkMode:         false,
  highContrast:     false,
  largeFont:        false,
  reduceMotion:     false,
  screenReaderMode: false,
  keyboardNav:      false,
  largerTargets:    false,
  simplifiedUI:     false,
  focusMode:        false,
}

const KEY = 'a11y_prefs'

function load(): A11yPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

export function useA11yPrefs() {
  const [prefs, setPrefs] = useState<A11yPrefs>(DEFAULTS)

  useEffect(() => {
    setPrefs(load())
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('a11y-high-contrast', prefs.highContrast)
    root.classList.toggle('a11y-large-font',    prefs.largeFont)
    root.classList.toggle('a11y-reduce-motion', prefs.reduceMotion)
    root.classList.toggle('a11y-focus-mode',    prefs.focusMode)
    root.classList.toggle('a11y-larger-targets', prefs.largerTargets)
    localStorage.setItem(KEY, JSON.stringify(prefs))
  }, [prefs])

  function set<K extends keyof A11yPrefs>(key: K, value: A11yPrefs[K]) {
    setPrefs(p => ({ ...p, [key]: value }))
  }

  function toggle(key: keyof A11yPrefs) {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
  }

  return { prefs, set, toggle }
}
