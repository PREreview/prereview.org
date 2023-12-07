import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as s from 'fp-ts/string'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import * as L from 'logger-fp-ts'
import type { Orcid } from 'orcid-id-ts'
import { P, match } from 'ts-pattern'
import { URL } from 'url'
import { revalidateIfStale, timeoutRequest, useStaleCache } from './fetch'
import { type NonEmptyString, NonEmptyStringC } from './types/string'

export interface OrcidApiEnv {
  readonly orcidApiUrl: URL
}

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

const ProfileLockedD = D.struct({
  'error-code': D.literal(9018),
})

const PersonalDetailsD = D.struct({
  name: D.nullable(
    D.struct({
      'given-names': D.struct({
        value: pipe(D.string, D.map(s.trim), D.compose(NonEmptyStringC)),
      }),
      'family-name': D.nullable(
        D.struct({
          value: pipe(D.string, D.map(s.trim), D.compose(NonEmptyStringC)),
        }),
      ),
    }),
  ),
})

const PersonDetailsResponseD = pipe(JsonD, D.compose(D.union(PersonalDetailsD, ProfileLockedD)))

const getPersonalDetails = flow(
  RTE.fromReaderK((orcid: Orcid) => orcidApiUrl(`${orcid}/personal-details`)),
  RTE.chainW(flow(F.Request('GET'), F.setHeader('Accept', 'application/json'), F.send)),
  RTE.mapLeft(() => 'network-error' as const),
  RTE.filterOrElseW(F.hasStatus(Status.OK, Status.Conflict), response => `${response.status} status code` as const),
  RTE.chainTaskEitherKW(flow(F.decode(PersonDetailsResponseD), TE.mapLeft(D.draw))),
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
      match(personalDetails)
        .with(
          { name: { 'given-names': { value: P.string }, 'family-name': { value: P.string } } },
          ({ name }) => `${name['given-names'].value} ${name['family-name'].value}` as NonEmptyString,
        )
        .with({ name: { 'given-names': { value: P.string } } }, ({ name }) => name['given-names'].value)
        .with({ name: null }, { 'error-code': 9018 }, () => undefined)
        .exhaustive(),
  ),
)

const orcidApiUrl = (path: string) => R.asks(({ orcidApiUrl }: OrcidApiEnv) => new URL(`/v3.0/${path}`, orcidApiUrl))
