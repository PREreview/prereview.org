import { Array, Boolean, Option, pipe } from 'effect'
import { parseAcceptLanguage } from 'intl-parse-accept-language'
import {
  DefaultLocale,
  isUserSelectableLocale,
  UserSelectableLocales,
  type UserSelectableLocale,
} from '../locales/index.ts'

export const detectLocale = (acceptLanguageHeader: string): Option.Option<UserSelectableLocale> => {
  const parsed = parseAcceptLanguage(acceptLanguageHeader, { ignoreWildcard: false })

  return pipe(
    Array.findFirst(parsed, candidate => {
      if (isUserSelectableLocale(candidate)) {
        return Option.some(candidate)
      }

      return Array.findFirst(UserSelectableLocales, locale =>
        locale.startsWith(candidate.split('-', 1)[0] ?? candidate),
      )
    }),
    Option.orElse(() =>
      Boolean.match(Array.contains(parsed, '*'), {
        onFalse: Option.none,
        onTrue: () => Option.some(DefaultLocale),
      }),
    ),
  )
}
