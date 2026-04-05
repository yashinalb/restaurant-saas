// Map language codes to emoji flags
export const FLAG_MAP: Record<string, string> = {
  en: '🇬🇧',
  tr: '🇹🇷',
  ru: '🇷🇺',
  el: '🇬🇷',
  de: '🇩🇪',
  fr: '🇫🇷',
  es: '🇪🇸',
  it: '🇮🇹',
  ar: '🇸🇦',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
};

export function getFlagForLanguage(code: string): string {
  return FLAG_MAP[code.toLowerCase()] || '🌐';
}