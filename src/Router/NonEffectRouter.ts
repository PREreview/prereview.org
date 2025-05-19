import { Headers, HttpMethod, HttpServerError, HttpServerRequest, type HttpServerResponse } from '@effect/platform'
import { Effect, Either, Match, Option, pipe, Record, type Runtime, String, Tuple } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as T from 'fp-ts/lib/Task.js'
import { Locale } from '../Context.js'
import * as EffectToFpts from '../EffectToFpts.js'
import * as FeatureFlags from '../feature-flags.js'
import * as FptsToEffect from '../FptsToEffect.js'
import { home } from '../home-page/index.js'
import type { SupportedLocale } from '../locales/index.js'
import type { OrcidOauth } from '../OrcidOauth.js'
import { partners } from '../partners.js'
import * as Preprints from '../Preprints/index.js'
import * as Prereviews from '../Prereviews/index.js'
import type { PublicUrl } from '../public-url.js'
import { requestAPrereview } from '../request-a-prereview-page/index.js'
import { reviewAPreprint } from '../review-a-preprint-page/index.js'
import * as ReviewRequests from '../ReviewRequests/index.js'
import * as Routes from '../routes.js'
import type { TemplatePage } from '../TemplatePage.js'
import * as Response from './Response.js'

export const nonEffectRouter: Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  HttpServerError.RouteNotFound | HttpServerError.RequestError,
  | HttpServerRequest.HttpServerRequest
  | Locale
  | TemplatePage
  | OrcidOauth
  | PublicUrl
  | FeatureFlags.FeatureFlags
  | Preprints.Preprints
  | Prereviews.Prereviews
  | ReviewRequests.ReviewRequests
> = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest

  const route = yield* Either.try({
    try: () => P.Route.parse(request.url),
    catch: () => new HttpServerError.RouteNotFound({ request }),
  })

  const runtime = yield* Effect.runtime()
  const locale = yield* Locale
  const featureFlags = yield* FeatureFlags.FeatureFlags
  const preprints = yield* Preprints.Preprints
  const prereviews = yield* Prereviews.Prereviews
  const reviewRequests = yield* ReviewRequests.ReviewRequests

  const body = yield* Effect.if(HttpMethod.hasBody(request.method), {
    onTrue: () =>
      pipe(
        Match.value(Option.getOrElse(Headers.get(request.headers, 'Content-Type'), () => 'application/octet-stream')),
        Match.when(String.includes('application/x-www-form-urlencoded'), () =>
          Effect.andThen(request.urlParamsBody, Record.fromEntries),
        ),
        Match.orElse(() => Effect.void),
      ),
    onFalse: () => Effect.void,
  })

  const env = {
    body,
    locale,
    featureFlags,
    method: request.method,
    preprints,
    prereviews,
    reviewRequests,
    runtime,
  } satisfies Env

  return yield* pipe(
    FptsToEffect.option(routerWithoutHyperTs(env).run(route)),
    Option.map(Tuple.getFirst),
    Effect.andThen(FptsToEffect.task),
    Effect.andThen(Response.toHttpServerResponse),
    Effect.mapError(() => new HttpServerError.RouteNotFound({ request })),
  )
})

interface Env {
  body: unknown
  locale: SupportedLocale
  featureFlags: typeof FeatureFlags.FeatureFlags.Service
  method: HttpMethod.HttpMethod
  preprints: typeof Preprints.Preprints.Service
  prereviews: typeof Prereviews.Prereviews.Service
  reviewRequests: typeof ReviewRequests.ReviewRequests.Service
  runtime: Runtime.Runtime<never>
}

const routerWithoutHyperTs = (env: Env) =>
  pipe(
    [
      pipe(
        Routes.partnersMatch.parser,
        P.map(() => T.of(partners(env.locale))),
      ),
      pipe(
        Routes.homeMatch.parser,
        P.map(() =>
          home({ canSeeDesignTweaks: env.featureFlags.canSeeDesignTweaks, locale: env.locale })({
            getRecentPrereviews: () => EffectToFpts.toTask(env.prereviews.getFiveMostRecent, env.runtime),
            getRecentReviewRequests: () => EffectToFpts.toTask(env.reviewRequests.getFiveMostRecent, env.runtime),
          }),
        ),
      ),
      pipe(
        Routes.requestAPrereviewMatch.parser,
        P.map(() =>
          requestAPrereview({ body: env.body, method: env.method, locale: env.locale })({
            resolvePreprintId: EffectToFpts.toTaskEitherK(env.preprints.resolvePreprintId, env.runtime),
          }),
        ),
      ),
      pipe(
        Routes.reviewAPreprintMatch.parser,
        P.map(() =>
          reviewAPreprint({ body: env.body, method: env.method, locale: env.locale })({
            resolvePreprintId: EffectToFpts.toTaskEitherK(env.preprints.resolvePreprintId, env.runtime),
          }),
        ),
      ),
    ],
    concatAll(P.getParserMonoid()),
  ) satisfies P.Parser<T.Task<Response.Response>>
