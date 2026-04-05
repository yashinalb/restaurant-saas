import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslation from './en/translation.json';
import trTranslation from './tr/translation.json';
import ruTranslation from './ru/translation.json';
import elTranslation from './el/translation.json';
import deTranslation from './de/translation.json';
import esTranslation from './es/translation.json';
import frTranslation from './fr/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      tr: { translation: trTranslation },
      ru: { translation: ruTranslation },
      el: { translation: elTranslation },
      de: { translation: deTranslation },
      es: { translation: esTranslation },
      fr: { translation: frTranslation },
    },
    fallbackLng: 'en',
    debug: false,
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;