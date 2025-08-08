import { HttpClient, HttpClientResponse } from '@effect/platform'
import { Context, Data, Effect, flow, identity, Match, pipe, Redacted, Schema } from 'effect'
import { URL } from 'url'
import { Html, rawHtml, sanitizeHtml } from '../html.js'
import * as StatusCodes from '../StatusCodes.js'

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
          Match.when({ status: StatusCodes.NotFound }, () => new GhostPageNotFound()),
          Match.orElse(() => new GhostPageUnavailable()),
        ),
      ),
    )
  })

export class GhostPageUnavailable extends Data.TaggedError('GhostPageUnavailable') {}

export class GhostPageNotFound extends Data.TaggedError('GhostPageNotFound') {}

export class GhostApi extends Context.Tag('GhostApi')<GhostApi, { key: Redacted.Redacted }>() {}
