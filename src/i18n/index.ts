import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import uk from './locales/uk.json';

const resources = {
    en: { translation: en },
    uk: { translation: uk },
};

// Get device locale and extract language code
const getDeviceLanguage = (): string => {
    const locale = Localization.getLocales()[0]?.languageCode || 'en';
    // Return the locale if we support it, otherwise fallback to 'en'
    return ['en', 'uk'].includes(locale) ? locale : 'en';
};

i18n.use(initReactI18next).init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    compatibilityJSON: 'v4',
    interpolation: {
        escapeValue: false, // React already escapes values
    },
    react: {
        useSuspense: false,
    },
});

export default i18n;
