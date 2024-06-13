import { type Formatter, format } from 'fp-ts-routing'
import * as R from 'fp-ts/lib/Reader.js'
import * as RE from 'fp-ts/lib/ReaderEither.js'
import { constant, pipe } from 'fp-ts/lib/function.js'

export interface PublicUrlEnv {
  publicUrl: URL
}

export function toUrl<A>(formatter: Formatter<A>, a: A) {
  return R.asks(({ publicUrl }: PublicUrlEnv) => pipe(new URL(format(formatter, a), publicUrl)))
}

export function ifHasSameOrigin(url: URL) {
  return RE.asksReaderEither(({ publicUrl }: PublicUrlEnv) =>
    pipe(
      url,
      RE.fromPredicate(url => url.origin === publicUrl.origin, constant('different-origin')),
    ),
  )
}
