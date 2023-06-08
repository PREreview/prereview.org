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
import { P, match } from 'ts-pattern'
import { revalidateIfStale, timeoutRequest, useStaleCache } from './fetch'
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
        'family-name': D.nullable(
          D.struct({
            value: NonEmptyStringC,
          }),
        ),
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
  RTE.local(revalidateIfStale()),
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.orElseFirstW(RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to get name from ORCID')))),
  RTE.bimap(
    () => 'unavailable' as const,
    personalDetails =>
      match(personalDetails.name)
        .with(
          { 'given-names': { value: P.string }, 'family-name': { value: P.string } },
          name => `${name['given-names'].value} ${name['family-name'].value}`,
        )
        .with({ 'given-names': { value: P.string } }, name => name['given-names'].value)
        .exhaustive(),
  ),
)
