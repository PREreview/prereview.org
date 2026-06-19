import { format } from 'fp-ts-routing'
import * as Routes from '../../routes.ts'

export type Input = `/${string}` | undefined

export type Result = `/${string}`

export function SanitizeRedirectTo(redirectTo: Input): Result {
  const url = new URL(redirectTo ?? '', 'https://example.com')

  const normalized = `${url.pathname}${url.search}` as `/${string}`

  if (redirectTo?.split('#')[0] !== normalized) {
    return format(Routes.myDetailsMatch.formatter, {}) as `/${string}`
  }

  return normalized
}
