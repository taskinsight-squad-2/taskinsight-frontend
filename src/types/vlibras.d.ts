import 'react'

declare module 'react' {
  interface HTMLAttributes<T> {
    vw?: string
    'vw-access-button'?: string
    'vw-plugin-wrapper'?: string
  }
}
