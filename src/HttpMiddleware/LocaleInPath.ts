import { Array, HashSet, Option, pipe, String } from 'effect'
import { type UserSelectableLocale, UserSelectableLocales } from '../locales/index.ts'

export const removeLocaleFromPath = (pathAndQuerystring: string): string => {
  const [path, queryParams] = pathAndQuerystring.split('?')
  if (path === undefined) {
    return pathAndQuerystring
  }
  const parts = path.split('/')

  const lowerCaseSupportedLocales = HashSet.map(UserSelectableLocales, String.toLowerCase)

  if (!HashSet.has(lowerCaseSupportedLocales, parts[1])) {
    return pathAndQuerystring
  }

  return pipe(
    parts,
    Array.remove(0),
    Array.remove(0),
    Array.join('/'),
    path => `/${path}${queryParams !== undefined ? `?${queryParams}` : ''}`,
  )
}

export const getLocaleFromPath = (pathAndQuerystring: string): Option.Option<UserSelectableLocale> => {
  const path = pathAndQuerystring.split('?')[0]
  if (path === undefined) {
    return Option.none()
  }

  const parts = path.split('/')

  for (const supportedLocale of UserSelectableLocales) {
    if (parts[1] === supportedLocale.toLowerCase()) {
      return Option.some(supportedLocale)
    }
  }

  return Option.none()
}
