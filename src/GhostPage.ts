import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Context, Data, Effect, flow, identity, Layer, Match, pipe, Redacted, Schema } from 'effect'
import { StatusCodes } from 'http-status-codes'
import { URL } from 'url'
import { Html, rawHtml, sanitizeHtml } from './html.js'

const HtmlSchema: Schema.Schema<Html, string> = Schema.transform(Schema.String, Schema.instanceOf(Html), {
  strict: true,
  decode: string => sanitizeHtml(string, true),
  encode: String,
})

const GhostPageSchema = Schema.Struct({
  pages: Schema.Tuple(
    Schema.Struct({
      html: HtmlSchema,
    }),
  ),
})

export class PageIsNotFound extends Data.TaggedError('PageIsNotFound') {}

export class PageIsUnavailable extends Data.TaggedError('PageIsUnavailable') {}

export class GetPageFromGhost extends Context.Tag('GetPageFromGhost')<
  GetPageFromGhost,
  (id: string) => Effect.Effect<Html, PageIsUnavailable | PageIsNotFound>
>() {}

export const getPageFromGhost = Effect.serviceFunctionEffect(GetPageFromGhost, identity)

export const getPage = (id: string) =>
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient
    const ghostApi = yield* GhostApi

    return yield* pipe(
      client.get(
        new URL(`https://content.prereview.org/ghost/api/content/pages/${id}/?key=${Redacted.value(ghostApi.key)}`),
      ),
      Effect.filterOrFail(response => response.status === 200, identity),
      Effect.andThen(HttpClientResponse.schemaBodyJson(GhostPageSchema)),
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

export class GhostPageUnavailable extends Data.TaggedError('GhostPageUnavailable') {}

export class GhostPageNotFound extends Data.TaggedError('GhostPageNotFound') {}

export class GhostApi extends Context.Tag('GhostApi')<GhostApi, { key: Redacted.Redacted }>() {}

const loadWithCachingClient = (id: string) =>
  pipe(
    getPage(id),
    Effect.tapError(error => Effect.logError('Failed to load ghost page').pipe(Effect.annotateLogs({ error }))),
    Effect.catchTag('GhostPageNotFound', () => Effect.fail(new PageIsNotFound())),
    Effect.catchTag('GhostPageUnavailable', () => Effect.fail(new PageIsUnavailable())),
  )

export const layer = Layer.effect(
  GetPageFromGhost,
  Effect.gen(function* () {
    const context = yield* Effect.context<GhostApi | HttpClient.HttpClient>()

    return id => pipe(loadWithCachingClient(id), Effect.provide(context))
  }),
)
