import React from 'react';
import BrndLandingPage from '../BrndLandingPage';
import { I18nProvider } from '@/i18n/I18nProvider';

/**
 * NotInMiniappPage - Shows BRND landing page when accessed from browser
 *
 * This component wraps the BrndLandingPage with the I18nProvider to enable
 * internationalization support for the landing page.
 */
export default function NotInMiniappPage(): React.ReactNode {
  return (
    <I18nProvider>
      <BrndLandingPage />
    </I18nProvider>
  );
}
