import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager, Platform } from 'react-native';
import { Language, translations } from '@/i18n/translations';

export type LanguageMode = Language | 'system';

const STORAGE_KEY = 'zofri.language';

// Languages that render right-to-left. None ship today, but the switch keeps
// the architecture ready (I18nManager is flipped when such a language is set).
const RTL_LANGUAGES: Language[] = [];

type Vars = Record<string, string | number>;

type I18nContextValue = {
  language: Language;
  languageMode: LanguageMode;
  setLanguageMode: (mode: LanguageMode) => void;
  t: (key: string, vars?: Vars) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function deviceLanguage(): Language {
  let tag = '';
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
    tag = navigator.language || '';
  }
  return tag.toLowerCase().startsWith('en') ? 'en' : 'de';
}

function lookup(language: Language, key: string): string {
  const parts = key.split('.');
  let node: unknown = translations[language];
  for (const part of parts) {
    if (node && typeof node === 'object' && part in (node as Record<string, unknown>)) {
      node = (node as Record<string, unknown>)[part];
    } else {
      return '';
    }
  }
  return typeof node === 'string' ? node : '';
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) =>
    name in vars ? String(vars[name]) : `{{${name}}}`
  );
}

export function I18nProvider({ children }: PropsWithChildren) {
  const [languageMode, setLanguageModeState] = useState<LanguageMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(stored => {
      if (stored === 'de' || stored === 'en' || stored === 'system') {
        setLanguageModeState(stored);
      }
    });
  }, []);

  const language: Language = languageMode === 'system' ? deviceLanguage() : languageMode;

  useEffect(() => {
    const shouldBeRTL = RTL_LANGUAGES.includes(language);
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
    }
  }, [language]);

  const setLanguageMode = useCallback((mode: LanguageMode) => {
    setLanguageModeState(mode);
    AsyncStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const t = useCallback((key: string, vars?: Vars) => {
    const value = lookup(language, key) || lookup('de', key) || key;
    return interpolate(value, vars);
  }, [language]);

  const value = useMemo<I18nContextValue>(() => ({
    language,
    languageMode,
    setLanguageMode,
    t
  }), [language, languageMode, setLanguageMode, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useTranslation must be used inside I18nProvider');
  return value;
}
