import { Schema } from 'effect'
import * as F from 'fetch-fp-ts'
import * as R from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { flow, identity, pipe } from 'fp-ts/lib/function.js'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/lib/Decoder.js'
import { match } from 'ts-pattern'
import { URL } from 'url'
import { type SleepEnv, revalidateIfStale, timeoutRequest, useStaleCache } from './fetch.js'
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

const GhostPageSchema = Schema.parseJson(
  Schema.Struct({
    pages: Schema.Tuple(
      Schema.Struct({
        html: HtmlSchema,
      }),
    ),
  }),
)

export const getPage = (
  id: string,
): RTE.ReaderTaskEither<GhostApiEnv & F.FetchEnv & SleepEnv, 'not-found' | 'unavailable', Html> =>
  pipe(
    RTE.fromReader(ghostUrl(`pages/${id}`)),
    RTE.chainW(flow(F.Request('GET'), F.send)),
    RTE.local(revalidateIfStale<F.FetchEnv & GhostApiEnv & SleepEnv>()),
    RTE.local(useStaleCache()),
    RTE.local(timeoutRequest(2000)),
    RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
    RTE.chainTaskEitherKW(F.getText(() => D.error(undefined, 'string'))),
    RTE.chainEitherKW(Schema.decodeEither(GhostPageSchema)),
    RTE.bimap(
      error =>
        match(error)
          .with({ status: Status.NotFound }, () => 'not-found' as const)
          .otherwise(() => 'unavailable' as const),
      response =>
        rawHtml(
          response.pages[0].html.toString().replaceAll(/href="https?:\/\/prereview\.org\/?(.*?)"/g, 'href="/$1"'),
        ),
    ),
  )

const ghostUrl = (path: string) =>
  R.asks(
    ({ ghostApi }: GhostApiEnv) =>
      new URL(`https://content.prereview.org/ghost/api/content/${path}?key=${ghostApi.key}`),
  )
