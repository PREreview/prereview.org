import { HttpRouter, HttpServerError, HttpServerRequest } from '@effect/platform'
import { Effect, Either, Option, pipe, Tuple } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import { Locale } from '../Context.js'
import * as FptsToEffect from '../FptsToEffect.js'
import type { SupportedLocale } from '../locales/index.js'
import type { OrcidOauth } from '../OrcidOauth.js'
import { partners } from '../partners.js'
import type { PublicUrl } from '../public-url.js'
import * as Routes from '../routes.js'
import type { TemplatePage } from '../TemplatePage.js'
import * as Response from './Response.js'

const nonEffectHandler: HttpRouter.Route.Handler<
  HttpServerError.RouteNotFound,
  Locale | TemplatePage | OrcidOauth | PublicUrl
> = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest

  const route = yield* Either.try({
    try: () => P.Route.parse(request.url),
    catch: () => new HttpServerError.RouteNotFound({ request }),
  })

  const locale = yield* Locale
  const env = { locale }

  return yield* pipe(
    FptsToEffect.option(routerWithoutHyperTs.run(route)),
    Option.map(Tuple.getFirst),
    Effect.andThen(readerTask => FptsToEffect.readerTask(readerTask, env)),
    Effect.andThen(Response.toHttpServerResponse),
    Effect.mapError(() => new HttpServerError.RouteNotFound({ request })),
  )
})

export const nonEffectRouter: HttpRouter.HttpRouter<
  HttpServerError.RouteNotFound,
  Locale | TemplatePage | OrcidOauth | PublicUrl
> = HttpRouter.fromIterable([HttpRouter.makeRoute('*', '*', nonEffectHandler)])

const routerWithoutHyperTs = pipe(
  [
    pipe(
      Routes.partnersMatch.parser,
      P.map(() => RT.asks((env: { locale: SupportedLocale }) => partners(env.locale))),
    ),
  ],
  concatAll(P.getParserMonoid()),
) satisfies P.Parser<RT.ReaderTask<never, Response.Response>>
