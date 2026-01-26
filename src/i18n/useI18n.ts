import { useContext } from 'react'
import { I18nContext, type I18nContextValue } from './context'

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  assert(ctx, 'useI18n must be used within I18nProvider')
  return ctx
}
