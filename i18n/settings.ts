// Reference list of the 20 locales supported by this app's i18n setup
// (wired into nuxt.config.ts as @nuxtjs/i18n locales — see i18n/locales/*.json).
export const defaultLocale = 'en' as const;

export const locales = [
  'en', // English
  'zh', // Chinese
  'es', // Spanish
  'de', // German
  'ja', // Japanese
  'fr', // French
  'ko', // Korean
  'it', // Italian
  'nl', // Dutch
  'ru', // Russian
  'pt', // Portuguese
  'sv', // Swedish
  'da', // Danish
  'no', // Norwegian
  'fi', // Finnish
  'ar', // Arabic
  'he', // Hebrew
  'th', // Thai
  'id', // Bahasa Indonesia
  'vi', // Vietnamese
] as const;

export type Locale = (typeof locales)[number];

export const i18n = {
  defaultLocale,
  locales,
} as const;

export const rtlLocales = ['ar', 'he'] as const;

export function isRtlLang(locale: Locale): boolean {
  return (rtlLocales as readonly string[]).includes(locale);
}


// Use this to create dynamic route handlers based on locale
export function getLocaleParamFromPathname(pathname: string): string | undefined {
  const segments = pathname.split('/');
  if (segments.length > 1) {
    const locale = segments[1];
    if (locale && (locales as readonly string[]).includes(locale)) {
      return locale;
    }
  }
  return undefined;
}

// Get absolute path for a specific locale
export function getLocalePrefix(locale: string | Locale): string {
  return String(locale) === 'en' ? '' : `/${locale}`;
}

export function getPathWithLocale(path: string, locale: Locale): string {
  // Remove any existing locale prefix if present
  const segments = path.split('/');
  if (segments.length > 1 && segments[1] && (locales as readonly string[]).includes(segments[1])) {
    segments.splice(1, 1);
    path = segments.join('/');
  }

  // Add the new locale
  const pathWithoutLeadingSlash = path.replace(/^\//, '');
  return `${getLocalePrefix(locale)}/${pathWithoutLeadingSlash}`;
}

// Get display name for each language
export function getLanguageDisplayNames() {
  return {
    en: 'English',
    zh: '中文',
    es: 'Español',
    de: 'Deutsch',
    ja: '日本語',
    fr: 'Français',
    ko: '한국어',
    it: 'Italiano',
    nl: 'Nederlands',
    ru: 'Русский',
    pt: 'Português',
    sv: 'Svenska',
    da: 'Dansk',
    no: 'Norsk',
    fi: 'Suomi',
    ar: 'العربية',
    he: 'עברית',
    th: 'ภาษาไทย',
    id: 'Bahasa Indonesia',
    vi: 'Tiếng Việt',
  };
}

/** Same list but all names in English — for admin UIs where consistency matters */
export function getLanguageEnglishNames(): Record<string, string> {
  return {
    en: 'English',
    zh: 'Chinese',
    es: 'Spanish',
    de: 'German',
    ja: 'Japanese',
    fr: 'French',
    ko: 'Korean',
    it: 'Italian',
    nl: 'Dutch',
    ru: 'Russian',
    pt: 'Portuguese',
    sv: 'Swedish',
    da: 'Danish',
    no: 'Norwegian',
    fi: 'Finnish',
    ar: 'Arabic',
    he: 'Hebrew',
    th: 'Thai',
    id: 'Indonesian',
    vi: 'Vietnamese',
  };
}