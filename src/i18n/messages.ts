import en from '../../messages/en.json'
import es from '../../messages/es.json'
import type { Locale } from './config'

export type Messages = Record<string, unknown>

// Sistema simple con carga inmediata (más confiable)
export const messagesByLocale: Record<Locale, Messages> = {
  en: en as Messages,
  es: es as Messages,
}
