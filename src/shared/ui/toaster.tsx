import { Toaster as Sonner } from 'sonner'
import type { CSSProperties } from 'react'

const kurioToastVars = {
  '--normal-bg': 'var(--color-card)',
  '--normal-bg-hover': 'var(--color-accent)',
  '--normal-border': 'var(--color-border)',
  '--normal-border-hover': '#3d2e24',
  '--normal-text': 'var(--color-foreground)',
  '--success-bg': '#14201a',
  '--success-border': '#1f3d2a',
  '--success-text': 'var(--color-success)',
  '--error-bg': '#2a1414',
  '--error-border': '#4a1f1f',
  '--error-text': '#fca5a5',
  '--info-bg': 'var(--color-card)',
  '--info-border': '#3d2e24',
  '--info-text': 'var(--color-text-accent)',
  '--warning-bg': '#241a0f',
  '--warning-border': '#3d2e24',
  '--warning-text': 'var(--color-text-secondary)',
  '--border-radius': '8px',
} as CSSProperties

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      richColors
      closeButton
      className="toaster"
      style={kurioToastVars}
      toastOptions={{
        classNames: {
          toast: 'kurio-toast',
          title: 'kurio-toast-title',
          description: 'kurio-toast-description',
          closeButton: 'kurio-toast-close',
        },
      }}
    />
  )
}
