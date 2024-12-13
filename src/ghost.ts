import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/lib/Either.js'
import * as J from 'fp-ts/lib/Json.js'
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

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

const HtmlD = pipe(
  D.string,
  D.map(string => sanitizeHtml(string, true)),
)

const GhostPageD = pipe(
  JsonD,
  D.compose(
    D.struct({
      pages: D.tuple(
        D.struct({
          html: HtmlD,
        }),
      ),
    }),
  ),
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
    RTE.chainTaskEitherKW(F.decode(GhostPageD)),
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
