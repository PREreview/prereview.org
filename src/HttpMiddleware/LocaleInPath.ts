import { Array, Option, pipe } from 'effect'
import { DefaultLocale, type SupportedLocale } from '../locales/index.js'

export const removeLocaleFromPath = (pathAndQuerystring: string): string => {
  const [path, queryParams] = pathAndQuerystring.split('?')
  if (path === undefined) {
    return pathAndQuerystring
  }
  const parts = path.split('/')

  if (parts[1] !== DefaultLocale.toLowerCase()) {
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
  const parts = pathAndQuerystring.split('/')
  if (parts[1] !== DefaultLocale.toLowerCase()) {
    return Option.none()
  }
  return Option.some(DefaultLocale)
}
