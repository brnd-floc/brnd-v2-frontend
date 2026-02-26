import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { I18nContext, type I18nContextValue, type TranslationValues } from './context';
import { LOCALE_COOKIE, defaultLocale, locales, type Locale } from './config';
import { messagesByLocale, type Messages } from './messages';

const assert: (condition: unknown, message: string) => asserts condition = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const getCookieValue = (cookieName: string): string | null => {
  const raw = typeof document !== 'undefined' ? document.cookie : '';
  if (!raw) return null;

  const parts = raw.split(';').map((p) => p.trim());
  const found = parts.find((p) => p.startsWith(`${cookieName}=`));
  if (!found) return null;

  return decodeURIComponent(found.slice(cookieName.length + 1));
};

const normalizeLocale = (value: string | null | undefined): Locale | null => {
  if (!value) return null;
  if (locales.includes(value as Locale)) return value as Locale;
  return null;
};

const getInitialLocale = (): Locale => {
  const cookieLocale = normalizeLocale(getCookieValue(LOCALE_COOKIE));
  if (cookieLocale) return cookieLocale;

  const browserLocale = normalizeLocale(typeof navigator !== 'undefined' ? navigator.language.split('-')[0] : null);
  if (browserLocale) return browserLocale;

  return defaultLocale;
};

const getMessageAtPath = (messages: Messages, key: string): unknown => {
  assert(key.length > 0, 't(): key must not be empty');

  const segments = key.split('.');
  let cursor: unknown = messages;

  for (const segment of segments) {
    assert(segment.length > 0, `t(): invalid key segment in ${key}`);
    assert(typeof cursor === 'object' && cursor !== null, `t(): missing messages for key ${key}`);

    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return cursor;
};

const interpolate = (template: string, values?: TranslationValues): string => {
  return template.replace(/\{(\w+)\}/g, (_, rawKey: string) => {
    assert(values, `t(): values are required for template: ${template}`);
    assert(Object.prototype.hasOwnProperty.call(values, rawKey), `t(): missing value for {${rawKey}} in template: ${template}`);
    return String(values[rawKey]);
  });
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale());

  const setLocale = useCallback((nextLocale: Locale) => {
    assert(locales.includes(nextLocale), `Invalid locale: ${nextLocale}`);

    document.cookie = `${LOCALE_COOKIE}=${encodeURIComponent(nextLocale)};path=/;max-age=31536000`;
    setLocaleState(nextLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const messages = useMemo(() => {
    const m = messagesByLocale[locale];
    if (!m || typeof m !== 'object') {
      console.warn(`Missing messages for locale: ${locale}, falling back to ${defaultLocale}`);
      return messagesByLocale[defaultLocale] || {};
    }
    return m;
  }, [locale]);

  const t = useCallback(
    (key: string, values?: TranslationValues) => {
      try {
        const raw = getMessageAtPath(messages, key);
        assert(typeof raw === 'string', `t(): message for key ${key} must be a string`);
        return interpolate(raw, values);
      } catch (error) {
        console.warn(`Translation missing for key: ${key} in locale: ${locale}`);
        return key; // Return key as fallback
      }
    },
    [messages, locale]
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      messages,
      t,
    }),
    [locale, messages, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
