import { Array, Boolean, Effect, HashSet, Option, pipe } from 'effect'
import { parseAcceptLanguage } from 'intl-parse-accept-language'
import { EnabledLocales } from '../Context.ts'
import { DefaultLocale, type UserSelectableLocale } from '../locales/index.ts'

export const detectLocale = Effect.fnUntraced(function* (
  acceptLanguageHeader: string,
): Effect.fn.Return<Option.Option<UserSelectableLocale>, never, EnabledLocales> {
  const enabledLocales = yield* EnabledLocales

  const parsed = parseAcceptLanguage(acceptLanguageHeader, { ignoreWildcard: false })

  return pipe(
    Array.findFirst(parsed, candidate => {
      if (HashSet.has(enabledLocales, candidate)) {
        return Option.some(candidate as UserSelectableLocale)
      }

      return Array.findFirst(enabledLocales, locale => locale.startsWith(candidate.split('-', 1)[0] ?? candidate))
    }),
    Option.orElse(() =>
      Boolean.match(Array.contains(parsed, '*'), {
        onFalse: Option.none,
        onTrue: () => Option.some(DefaultLocale),
      }),
    ),
  )
})
