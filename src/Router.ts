import { Headers, HttpMiddleware, HttpRouter, HttpServerResponse } from '@effect/platform'
import { Effect, identity, Option, pipe } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { Locale, LoggedInUser, Redis } from './Context.js'
import {
  type PageResponse,
  type RedirectResponse,
  type StreamlinePageResponse,
  toPage,
  type TwoUpPageResponse,
} from './response.js'
import * as Routes from './routes.js'
import { TemplatePage } from './TemplatePage.js'
import * as WriteFeedbackFlow from './WriteFeedbackFlow/index.js'

export const Router = pipe(
  HttpRouter.empty,
  HttpRouter.get(
    Routes.WriteFeedback.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedback.schema),
      Effect.andThen(WriteFeedbackFlow.WriteFeedbackPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteFeedbackStartNow.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedbackStartNow.schema),
      Effect.andThen(WriteFeedbackFlow.StartNow),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteFeedbackEnterFeedback.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedbackEnterFeedback.schema),
      Effect.andThen(WriteFeedbackFlow.EnterFeedbackPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.post(
    Routes.WriteFeedbackEnterFeedback.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedbackEnterFeedback.schema),
      Effect.andThen(WriteFeedbackFlow.EnterFeedbackSubmission),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.get(
    Routes.WriteFeedbackPublished.path,
    pipe(
      HttpRouter.schemaParams(Routes.WriteFeedbackPublished.schema),
      Effect.andThen(WriteFeedbackFlow.PublishedPage),
      Effect.andThen(toHttpServerResponse),
    ),
  ),
  HttpRouter.use(
    HttpMiddleware.make(
      Effect.andThen(HttpServerResponse.setHeaders({ 'Cache-Control': 'no-cache, private', Vary: 'Cookie' })),
    ),
  ),
  HttpRouter.get(
    '/health',
    Effect.gen(function* () {
      const maybeRedis = yield* Effect.serviceOption(Redis)

      if (Option.isNone(maybeRedis)) {
        return yield* HttpServerResponse.json({ status: 'ok' })
      }

      const redis = maybeRedis.value

      if (redis.status !== 'ready') {
        yield* Effect.fail(new Error(`Redis not ready (${redis.status})`))
      }

      yield* Effect.tryPromise({ try: () => redis.ping(), catch: identity })

      return yield* HttpServerResponse.json({ status: 'ok' })
    }).pipe(
      Effect.catchAll(error =>
        Effect.gen(function* () {
          const asError = error instanceof Error ? error : new Error(String(error))
          yield* Effect.logError('healthcheck failed').pipe(
            Effect.annotateLogs({ message: asError.message, name: asError.name }),
          )

          return yield* HttpServerResponse.json({ status: 'error' }, { status: StatusCodes.SERVICE_UNAVAILABLE })
        }),
      ),
    ),
  ),
  HttpRouter.get('/robots.txt', HttpServerResponse.text('User-agent: *\nAllow: /')),
)

function toHttpServerResponse(
  response: PageResponse | StreamlinePageResponse | TwoUpPageResponse | RedirectResponse,
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, Locale | TemplatePage> {
  return Effect.gen(function* () {
    if (response._tag === 'RedirectResponse') {
      return yield* HttpServerResponse.empty({
        status: response.status,
        headers: Headers.fromInput({ Location: response.location.toString() }),
      })
    }

    const locale = yield* Locale
    const templatePage = yield* TemplatePage
    const user = yield* Effect.serviceOption(LoggedInUser)

    return yield* pipe(
      templatePage(
        toPage({
          locale,
          response,
          user: Option.getOrUndefined(user),
        }),
      ).toString(),
      HttpServerResponse.html,
    )
  })
}
