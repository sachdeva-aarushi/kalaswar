import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { SupportedLanguage } from '@/i18n';

export function useLanguage() {
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) || 'en'
  );

  const setLanguage = useCallback(
    async (lang: SupportedLanguage) => {
      await i18n.changeLanguage(lang);
      setCurrentLang(lang);
    },
    [i18n]
  );

  const toggleLanguage = useCallback(async () => {
    const nextLang: SupportedLanguage = currentLang === 'en' ? 'hi' : 'en';
    await setLanguage(nextLang);
  }, [currentLang, setLanguage]);

  return {
    language: currentLang,
    setLanguage,
    toggleLanguage,
    isHindi: currentLang === 'hi',
  };
}

