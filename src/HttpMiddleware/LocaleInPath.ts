import { Array, Effect, HashSet, Option, pipe, String } from 'effect'
import { EnabledLocales } from '../Context.ts'
import type { UserSelectableLocale } from '../locales/index.ts'

export const removeLocaleFromPath = Effect.fnUntraced(function* (
  pathAndQuerystring: string,
): Effect.fn.Return<string, never, EnabledLocales> {
  const [path, queryParams] = pathAndQuerystring.split('?')
  if (path === undefined) {
    return pathAndQuerystring
  }
  const parts = path.split('/')

  const enabledLocales = yield* EnabledLocales

  const lowerCaseEnabledLocales = HashSet.map(enabledLocales, String.toLowerCase)

  if (!HashSet.has(lowerCaseEnabledLocales, parts[1])) {
    return pathAndQuerystring
  }

  return pipe(
    parts,
    Array.remove(0),
    Array.remove(0),
    Array.join('/'),
    path => `/${path}${queryParams !== undefined ? `?${queryParams}` : ''}`,
  )
})

export const getLocaleFromPath = Effect.fnUntraced(function* (
  pathAndQuerystring: string,
): Effect.fn.Return<Option.Option<UserSelectableLocale>, never, EnabledLocales> {
  const enabledLocales = yield* EnabledLocales

  const path = pathAndQuerystring.split('?')[0]
  if (path === undefined) {
    return Option.none()
  }

  const parts = path.split('/')

  for (const enabledLocale of enabledLocales) {
    if (parts[1] === enabledLocale.toLowerCase()) {
      return Option.some(enabledLocale)
    }
  }

  return Option.none()
})
