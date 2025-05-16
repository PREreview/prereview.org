import { HttpRouter, HttpServerError, HttpServerRequest } from '@effect/platform'
import { Effect, Either, Option, pipe, Tuple } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as T from 'fp-ts/lib/Task.js'
import { Locale } from '../Context.js'
import * as FeatureFlags from '../feature-flags.js'
import * as FptsToEffect from '../FptsToEffect.js'
import { home } from '../home-page/index.js'
import type { SupportedLocale } from '../locales/index.js'
import type { OrcidOauth } from '../OrcidOauth.js'
import { partners } from '../partners.js'
import * as Prereviews from '../Prereviews/index.js'
import type { PublicUrl } from '../public-url.js'
import * as ReviewRequests from '../ReviewRequests/index.js'
import * as Routes from '../routes.js'
import type { TemplatePage } from '../TemplatePage.js'
import * as Response from './Response.js'

const nonEffectHandler: HttpRouter.Route.Handler<
  HttpServerError.RouteNotFound,
  | Locale
  | TemplatePage
  | OrcidOauth
  | PublicUrl
  | FeatureFlags.FeatureFlags
  | Prereviews.Prereviews
  | ReviewRequests.ReviewRequests
> = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest

  const route = yield* Either.try({
    try: () => P.Route.parse(request.url),
    catch: () => new HttpServerError.RouteNotFound({ request }),
  })

  const locale = yield* Locale
  const featureFlags = yield* FeatureFlags.FeatureFlags
  const prereviews = yield* Prereviews.Prereviews
  const reviewRequests = yield* ReviewRequests.ReviewRequests
  const env = { locale, featureFlags, prereviews, reviewRequests } satisfies Env

  return yield* pipe(
    FptsToEffect.option(routerWithoutHyperTs(env).run(route)),
    Option.map(Tuple.getFirst),
    Effect.andThen(FptsToEffect.task),
    Effect.andThen(Response.toHttpServerResponse),
    Effect.mapError(() => new HttpServerError.RouteNotFound({ request })),
  )
})

export const nonEffectRouter: HttpRouter.HttpRouter<
  HttpServerError.RouteNotFound,
  | Locale
  | TemplatePage
  | OrcidOauth
  | PublicUrl
  | FeatureFlags.FeatureFlags
  | Prereviews.Prereviews
  | ReviewRequests.ReviewRequests
> = HttpRouter.fromIterable([HttpRouter.makeRoute('*', '*', nonEffectHandler)])

interface Env {
  locale: SupportedLocale
  featureFlags: typeof FeatureFlags.FeatureFlags.Service
  prereviews: typeof Prereviews.Prereviews.Service
  reviewRequests: typeof ReviewRequests.ReviewRequests.Service
}

const routerWithoutHyperTs = (env: Env) =>
  pipe(
    [
      pipe(
        Routes.partnersMatch.parser,
        P.map(() => T.of(partners(env.locale))),
      ),
    ],
    concatAll(P.getParserMonoid()),
  ) satisfies P.Parser<T.Task<Response.Response>>
