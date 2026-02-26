import { useCallback, useTransition } from 'react';
import { type Locale } from './config';
import { useI18n } from './useI18n';

export function useLocale(): Locale {
  const { locale } = useI18n();
  return locale;
}

export function useChangeLocale() {
  const { setLocale } = useI18n();
  const [isPending, startTransition] = useTransition();

  const changeLocale = useCallback(
    (newLocale: Locale) => {
      startTransition(() => {
        setLocale(newLocale);
      });
    },
    [setLocale]
  );

  return { changeLocale, isPending };
}
