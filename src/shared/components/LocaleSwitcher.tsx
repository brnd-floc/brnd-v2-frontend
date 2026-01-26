import { Globe, Loader2 } from 'lucide-react'
import { locales, localeNames, type Locale } from '@/i18n/config'
import { useChangeLocale, useLocale } from '@/i18n/useLocale'
import styles from './LocaleSwitcher.module.scss'

export function LocaleSwitcher() {
  const currentLocale = useLocale()
  const { changeLocale, isPending } = useChangeLocale()

  return (
    <div className={styles.container}>
      {isPending ? (
        <Loader2 className={`${styles.icon} animate-spin`} />
      ) : (
        <Globe className={styles.icon} />
      )}
      <select
        aria-label="Language"
        value={currentLocale}
        onChange={(e) => changeLocale(e.target.value as Locale)}
        disabled={isPending}
        className={styles.select}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale} className={styles.option}>
            {localeNames[locale]}
          </option>
        ))}
      </select>
    </div>
  )
}
