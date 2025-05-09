import { Array, HashSet, Option, pipe, String } from 'effect'
import { DefaultLocale, SupportedLocales, type SupportedLocale } from '../locales/index.js'

export const removeLocaleFromPath = (pathAndQuerystring: string): string => {
  const [path, queryParams] = pathAndQuerystring.split('?')
  if (path === undefined) {
    return pathAndQuerystring
  }
  const parts = path.split('/')

  const lowerCaseSupportedLocales = HashSet.map(SupportedLocales, String.toLowerCase)

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

export const getLocaleFromPath = (pathAndQuerystring: string): Option.Option<SupportedLocale> => {
  const path = pathAndQuerystring.split('?')[0]
  if (path === undefined) {
    return Option.none()
  }

  const parts = path.split('/')

  if (parts[1] !== DefaultLocale.toLowerCase()) {
    return Option.none()
  }
  return Option.some(DefaultLocale)
}
