import { FetchHttpClient, HttpClient, HttpClientResponse } from '@effect/platform'
import { Context, Effect, flow, identity, Match, Schema } from 'effect'
import type * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/lib/Either.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import { StatusCodes } from 'http-status-codes'
import { URL } from 'url'
import { type SleepEnv, revalidateIfStale, useStaleCache } from './fetch.js'
import { type Html, rawHtml, sanitizeHtml } from './html.js'

export interface GhostApiEnv {
  ghostApi: {
    key: string
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
): RTE.ReaderTaskEither<GhostApiEnv & F.FetchEnv & SleepEnv, 'not-found' | 'unavailable', Html> =>
  pipe(
    R.asks(
      (env: GhostApiEnv & F.FetchEnv) => () =>
        pipe(
          id,
          getPageWithEffect,
          Effect.timeoutFail({ duration: '2 seconds', onTimeout: () => 'unavailable' as const }),
          Effect.match({
            onFailure: E.left,
            onSuccess: E.right,
          }),
          Effect.provideService(GhostApi, env.ghostApi),
          Effect.provide(FetchHttpClient.layer),
          Effect.provideService(FetchHttpClient.Fetch, env.fetch as unknown as typeof globalThis.fetch),
          Effect.runPromise,
        ),
    ),
    RTE.local(revalidateIfStale<F.FetchEnv & GhostApiEnv & SleepEnv>()),
    RTE.local(useStaleCache()),
  )

export class GhostApi extends Context.Tag('GhostApi')<GhostApi, { key: string }>() {}

const getPageWithEffect = (id: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const ghostApi = yield* GhostApi

    return yield* pipe(
      client.get(new URL(`https://content.prereview.org/ghost/api/content/pages/${id}?key=${ghostApi.key}`)),
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
          Match.when({ status: StatusCodes.NOT_FOUND }, () => 'not-found' as const),
          Match.orElse(() => 'unavailable' as const),
        ),
      ),
    )
  })
