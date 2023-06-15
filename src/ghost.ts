import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { URL } from 'url'
import { revalidateIfStale, timeoutRequest, useStaleCache } from './fetch'
import { type Html, sanitizeHtml } from './html'

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

export const getPage: (
  id: string,
) => RTE.ReaderTaskEither<GhostApiEnv & F.FetchEnv, 'not-found' | 'unavailable', Html> = flow(
  RTE.fromReaderK(id => ghostUrl(`pages/${id}`)),
  RTE.chainW(flow(F.Request('GET'), F.send)),
  RTE.local(revalidateIfStale()),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
  RTE.chainTaskEitherKW(F.decode(GhostPageD)),
  RTE.bimap(
    error =>
      match(error)
        .with({ status: Status.NotFound }, () => 'not-found' as const)
        .otherwise(() => 'unavailable' as const),
    get('pages.[0].html'),
  ),
)

const ghostUrl = (path: string) =>
  R.asks(
    ({ ghostApi }: GhostApiEnv) =>
      new URL(`https://content.prereview.org/ghost/api/content/${path}?key=${ghostApi.key}`),
  )
