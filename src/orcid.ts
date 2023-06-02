import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import * as L from 'logger-fp-ts'
import type { Orcid } from 'orcid-id-ts'
import { NonEmptyStringC } from './string'

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

const PersonalDetailsD = pipe(
  JsonD,
  D.compose(
    D.struct({
      name: D.struct({
        'given-names': D.struct({
          value: NonEmptyStringC,
        }),
        'family-name': D.struct({
          value: NonEmptyStringC,
        }),
      }),
    }),
  ),
)

const getPersonalDetails = flow(
  (orcid: Orcid) => `https://pub.orcid.org/v3.0/${orcid}/personal-details`,
  F.Request('GET'),
  F.setHeader('Accept', 'application/json'),
  F.send,
  RTE.mapLeft(() => 'network-error' as const),
  RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'non-200-response' as const),
  RTE.chainTaskEitherKW(flow(F.decode(PersonalDetailsD), TE.mapLeft(D.draw))),
)

export const getNameFromOrcid = flow(
  getPersonalDetails,
  RTE.orElseFirstW(RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to get name from ORCID')))),
  RTE.bimap(
    () => 'unavailable' as const,
    personalDetails => `${personalDetails.name['given-names'].value} ${personalDetails.name['family-name'].value}`,
  ),
)
