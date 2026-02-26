import { useCallback } from 'react';
import { useI18n } from './useI18n';

type TranslationValues = Record<string, string | number>

export function useTranslations(namespace?: string) {
  const { t } = useI18n();

  return useCallback(
    (key: string, values?: TranslationValues) => {
      const fullKey = namespace ? `${namespace}.${key}` : key;
      return t(fullKey, values);
    },
    [namespace, t]
  );
}
