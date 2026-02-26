import { createContext } from 'react';
import type { Locale } from './config';
import type { Messages } from './messages';

export type TranslationValues = Record<string, string | number>

export type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  messages: Messages
  t: (key: string, values?: TranslationValues) => string
}

export const I18nContext = createContext<I18nContextValue | null>(null);
