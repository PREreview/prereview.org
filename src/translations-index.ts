import * as en from './translations/en'
import * as es from './translations/es'

export const translations = {
  en,
  es,
}

export type SupportedLang = keyof typeof translations
