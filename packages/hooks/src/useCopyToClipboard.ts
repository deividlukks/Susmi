/**
 * Hook para copiar texto para clipboard
 */

'use client'

import { useState, useCallback } from 'react'

export function useCopyToClipboard(): [
  string | null,
  (text: string) => Promise<boolean>,
  () => void
] {
  const [copiedText, setCopiedText] = useState<string | null>(null)

  const copy = useCallback(async (text: string): Promise<boolean> => {
    if (!navigator?.clipboard) {
      console.warn('Clipboard not supported')
      return false
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      return true
    } catch (error) {
      console.error('Copy failed:', error)
      setCopiedText(null)
      return false
    }
  }, [])

  const reset = useCallback(() => {
    setCopiedText(null)
  }, [])

  return [copiedText, copy, reset]
}
