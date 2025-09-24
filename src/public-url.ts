import { Context, Function, pipe } from 'effect'
import { type Formatter, format } from 'fp-ts-routing'
import * as R from 'fp-ts/lib/Reader.js'
import * as RE from 'fp-ts/lib/ReaderEither.js'
import type { Route } from './routes.ts'

export interface PublicUrlEnv {
  publicUrl: URL
}

export class PublicUrl extends Context.Tag('PublicUrl')<PublicUrl, URL>() {}

export function toUrl<A>(formatter: Formatter<A> | Route<A>, a: A) {
  return R.asks(({ publicUrl }: PublicUrlEnv) =>
    pipe(new URL('href' in formatter ? formatter.href(a) : format(formatter, a), publicUrl)),
  )
}

export function ifHasSameOrigin(url: URL) {
  return RE.asksReaderEither(({ publicUrl }: PublicUrlEnv) =>
    pipe(
      url,
      RE.fromPredicate(url => url.origin === publicUrl.origin, Function.constant('different-origin')),
    ),
  )
}
