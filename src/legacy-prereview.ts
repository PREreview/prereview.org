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

export interface LegacyPrereviewApiEnv {
  legacyPrereviewApi: {
    app: string
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
  (orcid: Orcid) => new URL(orcid, 'https://prereview.org/api/v2/users/'),
  F.Request('GET'),
  RTE.fromReaderK(addLegacyPrereviewApiHeaders),
  RTE.chainW(F.send),
  RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
  RTE.chainTaskEitherKW(F.decode(LegacyPrereviewUserD)),
  RTE.map(get('data.personas.[0].name')),
)

function addLegacyPrereviewApiHeaders(request: F.Request) {
  return R.asks(({ legacyPrereviewApi: { app, key } }: LegacyPrereviewApiEnv) =>
    pipe(request, F.setHeaders({ 'X-API-App': app, 'X-API-Key': key })),
  )
}
