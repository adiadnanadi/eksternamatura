'use client'

import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderInline(tex: string, displayMode = false): string {
  try {
    return katex.renderToString(tex, {
      throwOnError: false,
      displayMode,
      output: 'html',
      strict: false,
    })
  } catch {
    return escapeHtml(`$${tex}$`)
  }
}

/** Renderuje tekst u kojem su formule zapisane kao $...$ (KaTeX). */
export function renderMathToHtml(text: string): string {
  if (!text) return ''
  const parts = text.split(/(\$[^$\n]+?\$)/g)
  return parts
    .map(p => {
      if (p.length > 2 && p.startsWith('$') && p.endsWith('$')) {
        return renderInline(p.slice(1, -1))
      }
      return escapeHtml(p).replace(/\n/g, '<br/>')
    })
    .join('')
}

export function MathText({
  text,
  className,
}: {
  text: string
  className?: string
}) {
  const html = useMemo(() => renderMathToHtml(text), [text])
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
