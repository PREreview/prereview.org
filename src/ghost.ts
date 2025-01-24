import { FetchHttpClient, HttpClient, HttpClientResponse } from '@effect/platform'
import { Context, Data, Effect, flow, identity, Match, Redacted, Schema } from 'effect'
import type * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/lib/Either.js'
import * as R from 'fp-ts/lib/Reader.js'
import type * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import { StatusCodes } from 'http-status-codes'
import { URL } from 'url'
import { type Html, rawHtml, sanitizeHtml } from './html.js'

export interface GhostApiEnv {
  ghostApi: {
    key: Redacted.Redacted
  }
}

const HtmlSchema: Schema.Schema<Html, string> = Schema.transform(Schema.String, Schema.Object, {
  strict: true,
  decode: string => sanitizeHtml(string, true),
  encode: String,
}) as Schema.Schema<Html, string>

const GhostPageSchema = Schema.Struct({
  pages: Schema.Tuple(
    Schema.Struct({
      html: HtmlSchema,
    }),
  ),
})

export const getPage = (
  id: string,
): RTE.ReaderTaskEither<GhostApiEnv & F.FetchEnv, 'not-found' | 'unavailable', Html> =>
  pipe(
    R.asks(
      (env: GhostApiEnv & F.FetchEnv) => () =>
        pipe(
          id,
          getPageWithEffect,
          Effect.timeout('2 seconds'),
          Effect.map(E.right),
          Effect.tapError(error => Effect.logError('Failed to load ghost page').pipe(Effect.annotateLogs({ error }))),
          Effect.tapDefect(error => Effect.logError('Failed to load ghost page').pipe(Effect.annotateLogs({ error }))),
          Effect.catchTag('GhostPageNotFound', () => Effect.succeed(E.left('not-found' as const))),
          Effect.catchTag('GhostPageUnavailable', () => Effect.succeed(E.left('unavailable' as const))),
          Effect.catchTag('TimeoutException', () => Effect.succeed(E.left('unavailable' as const))),
          Effect.provideService(GhostApi, env.ghostApi),
          Effect.provide(FetchHttpClient.layer),
          Effect.provideService(FetchHttpClient.Fetch, env.fetch as unknown as typeof globalThis.fetch),
          Effect.runPromise,
        ),
    ),
  )

export class GhostApi extends Context.Tag('GhostApi')<GhostApi, { key: Redacted.Redacted }>() {}

class GhostPageNotFound extends Data.TaggedError('GhostPageNotFound') {}

class GhostPageUnavailable extends Data.TaggedError('GhostPageUnavailable') {}

export const getPageWithEffect = (id: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const ghostApi = yield* GhostApi

    return yield* pipe(
      client.get(
        new URL(`https://content.prereview.org/ghost/api/content/pages/${id}/?key=${Redacted.value(ghostApi.key)}`),
      ),
      Effect.filterOrFail(response => response.status === 200, identity),
      Effect.andThen(HttpClientResponse.schemaBodyJson(GhostPageSchema)),
      Effect.scoped,
      Effect.andThen(response => response.pages[0].html),
      Effect.andThen(html =>
        rawHtml(html.toString().replaceAll(/href="https?:\/\/prereview\.org\/?(.*?)"/g, 'href="/$1"')),
      ),
      Effect.mapError(
        flow(
          Match.value,
          Match.when({ status: StatusCodes.NOT_FOUND }, () => new GhostPageNotFound()),
          Match.orElse(() => new GhostPageUnavailable()),
        ),
      ),
    )
  })
