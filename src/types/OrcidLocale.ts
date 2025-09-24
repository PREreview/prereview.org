import { flow, Option } from 'effect'
import { DefaultLocale, type SupportedLocale } from '../locales/index.ts'

export type OrcidLocale = (typeof OrcidLocales)[number]

// https://info.orcid.org/ufaqs/what-display-languages-does-orcid-support/
export const OrcidLocales = [
  'ar',
  'cs',
  'en',
  'es',
  'fr',
  'de',
  'it',
  'ja',
  'ko',
  'pl',
  'pt',
  'ru',
  'tr',
  'zh_CN',
  'zh_TW',
] as const

export const isOrcidLocale = (u: unknown): u is OrcidLocale =>
  typeof u === 'string' && OrcidLocales.includes(u as never)

export const parse = (s: string): Option.Option<OrcidLocale> => {
  if (!/^[a-z]{1,}(?:[-_][a-z0-9]+)*$/i.test(s)) {
    return Option.none()
  }
  const parts = s.split(/[_-]/)

  const candidates = parts.map((_, i) => parts.slice(0, i + 1).join('_'))

  for (const candidate of candidates.reverse()) {
    if (isOrcidLocale(candidate)) {
      return Option.some(candidate)
    }
  }

  return Option.none()
}

export const fromSupportedLocale: (locale: SupportedLocale) => OrcidLocale = flow(
  parse,
  Option.orElse(() => parse(DefaultLocale)),
  Option.getOrElse<OrcidLocale>(() => 'en'),
)
