import { Array, Boolean, Option, pipe } from 'effect'
import { parseAcceptLanguage } from 'intl-parse-accept-language'
import { DefaultLocale, isSupportedLocale, SupportedLocales, type SupportedLocale } from '../locales/index.js'

export const detectLocale = (acceptLanguageHeader: string): Option.Option<SupportedLocale> => {
  const parsed = parseAcceptLanguage(acceptLanguageHeader, { ignoreWildcard: false })

  return pipe(
    Array.findFirst(parsed, candidate => {
      if (isSupportedLocale(candidate)) {
        return Option.some(candidate)
      }

      return Array.findFirst(SupportedLocales, locale => locale.startsWith(candidate.split('-', 1)[0] ?? candidate))
    }),
    Option.orElse(() =>
      Boolean.match(Array.contains(parsed, '*'), {
        onFalse: Option.none,
        onTrue: () => Option.some(DefaultLocale),
      }),
    ),
  )
}
