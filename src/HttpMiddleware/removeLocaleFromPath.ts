import { Array, pipe } from 'effect'
import { DefaultLocale } from '../locales/index.js'

export const removeLocaleFromPath = (path: string): string => {
  const parts = path.split('/')

  if (parts[1] !== DefaultLocale.toLowerCase()) {
    return path
  }

  return pipe(parts, Array.remove(1), Array.join('/'))
}
