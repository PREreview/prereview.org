import { Option } from 'effect'
import type { SupportedLocale } from '../locales/index.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const detectLocale = (acceptLanguageHeader: string): Option.Option<SupportedLocale> => {
  return Option.none()
}
