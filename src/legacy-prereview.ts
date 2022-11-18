import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import { Orcid } from 'orcid-id-ts'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import { URL } from 'url'

export interface LegacyPrereviewApiEnv {
  legacyPrereviewApi: {
    app: string
    key: string
    url: URL
  }
}

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

const LegacyPrereviewUserD = pipe(
  JsonD,
  D.compose(
    D.struct({
      data: D.struct({
        personas: D.tuple(
          D.struct({
            isAnonymous: D.literal(true),
            name: D.string,
          }),
        ),
      }),
    }),
  ),
)

export const getPseudonymFromLegacyPrereview = flow(
  RTE.fromReaderK((orcid: Orcid) => legacyPrereviewUrl(`users/${orcid}`)),
  RTE.chainReaderK(flow(F.Request('GET'), addLegacyPrereviewApiHeaders)),
  RTE.chainW(F.send),
  RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
  RTE.chainTaskEitherKW(F.decode(LegacyPrereviewUserD)),
  RTE.bimap(
    error =>
      match(error)
        .with({ status: Status.NotFound }, () => 'no-pseudonym' as const)
        .otherwise(identity),
    get('data.personas.[0].name'),
  ),
)

function addLegacyPrereviewApiHeaders(request: F.Request) {
  return R.asks(({ legacyPrereviewApi: { app, key } }: LegacyPrereviewApiEnv) =>
    pipe(request, F.setHeaders({ 'X-API-App': app, 'X-API-Key': key })),
  )
}

const legacyPrereviewUrl = (path: string) =>
  R.asks(({ legacyPrereviewApi }: LegacyPrereviewApiEnv) => new URL(`/api/v2/${path}`, legacyPrereviewApi.url))
