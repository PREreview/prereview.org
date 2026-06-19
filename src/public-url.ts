import { Url } from '@effect/platform'
import { Context, Effect, Function, pipe } from 'effect'
import { format, type Formatter } from 'fp-ts-routing'
import * as R from 'fp-ts/lib/Reader.js'
import * as RE from 'fp-ts/lib/ReaderEither.js'
import type { QueryRoute, Route } from './routes.ts'

export interface PublicUrlEnv {
  publicUrl: URL
}

export class PublicUrl extends Context.Tag('PublicUrl')<PublicUrl, URL>() {}

const fromString = (url: string) => Effect.andThen(PublicUrl, publicUrl => Url.fromString(url, publicUrl))

export const forRoute: {
  <
    A extends { readonly [K in keyof A]: unknown },
    I extends { readonly [K in keyof I]: string | ReadonlyArray<string> | undefined },
  >(
    route: QueryRoute<A, I>,
    a: A,
  ): Effect.Effect<URL, never, PublicUrl>
  <A>(route: Route<A> | Formatter<A>, a: A): Effect.Effect<URL, never, PublicUrl>
  (route: `/${string}`): Effect.Effect<URL, never, PublicUrl>
} = <A, I extends { readonly [K in keyof I]: string | ReadonlyArray<string> | undefined }>(
  route: Route<A> | QueryRoute<A, I> | Formatter<A> | `/${string}`,
  args = {} as A,
) =>
  Effect.orDie(fromString(typeof route === 'string' ? route : 'href' in route ? route.href(args) : format(route, args)))

export const toUrl: {
  <A>(route: Route<A> | Formatter<A>, a: A): R.Reader<PublicUrlEnv, URL>
  (route: `/${string}`): R.Reader<PublicUrlEnv, URL>
} = <A>(formatter: Route<A> | Formatter<A> | `/${string}`, a = {} as A) =>
  R.asks(
    ({ publicUrl }: PublicUrlEnv) =>
      new URL(
        typeof formatter === 'string' ? formatter : 'href' in formatter ? formatter.href(a) : format(formatter, a),
        publicUrl,
      ),
  )

export function ifHasSameOrigin(url: URL) {
  return RE.asksReaderEither(({ publicUrl }: PublicUrlEnv) =>
    pipe(
      url,
      RE.fromPredicate(url => url.origin === publicUrl.origin, Function.constant('different-origin')),
    ),
  )
}
