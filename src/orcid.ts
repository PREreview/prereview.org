import { Context, type Option, type Redacted, String, flow, identity, pipe } from 'effect'
import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/lib/Either.js'
import * as J from 'fp-ts/lib/Json.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import * as D from 'io-ts/lib/Decoder.js'
import * as L from 'logger-fp-ts'
import { P, match } from 'ts-pattern'
import { URL } from 'url'
import * as StatusCodes from './StatusCodes.js'
import { timeoutRequest, useStaleCache } from './fetch.js'
import { NonEmptyString, NonEmptyStringC } from './types/NonEmptyString.js'
import type { OrcidId } from './types/OrcidId.js'

export class OrcidApi extends Context.Tag('OrcidApi')<
  OrcidApi,
  { origin: URL; token: Option.Option<Redacted.Redacted> }
>() {}

interface OrcidApiEnv {
  readonly orcidApiUrl: URL
  readonly orcidApiToken?: string
}

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

const ProfileLockedD = D.struct({
  'error-code': D.literal(9018, 9044),
})

const PersonalDetailsD = D.struct({
  name: D.nullable(
    D.struct({
      'given-names': D.struct({
        value: pipe(D.string, D.map(String.trim), D.compose(NonEmptyStringC)),
      }),
      'family-name': D.nullable(
        D.struct({
          value: pipe(D.string, D.map(String.trim), D.compose(NonEmptyStringC)),
        }),
      ),
      'credit-name': D.nullable(
        D.struct({
          value: pipe(D.string, D.map(String.trim), D.compose(NonEmptyStringC)),
        }),
      ),
    }),
  ),
})

const PersonDetailsResponseD = pipe(JsonD, D.compose(D.union(PersonalDetailsD, ProfileLockedD)))

const getPersonalDetails = flow(
  RTE.fromReaderK((orcid: OrcidId) => orcidApiUrl(`${orcid}/personal-details`)),
  RTE.map(F.Request('GET')),
  RTE.chainReaderK(addOrcidApiHeaders),
  RTE.chainW(flow(F.setHeader('Accept', 'application/json'), F.send)),
  RTE.mapLeft(() => 'network-error' as const),
  RTE.filterOrElseW(
    F.hasStatus(StatusCodes.OK, StatusCodes.Conflict),
    response => `${response.status} status code` as const,
  ),
  RTE.chainTaskEitherKW(flow(F.decode(PersonDetailsResponseD), TE.mapLeft(D.draw))),
)

export const getNameFromOrcid = flow(
  getPersonalDetails,
  RTE.local(useStaleCache()),
  RTE.local(timeoutRequest(2000)),
  RTE.orElseFirstW(RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to get name from ORCID')))),
  RTE.bimap(
    () => 'unavailable' as const,
    personalDetails =>
      match(personalDetails)
        .with({ name: { 'credit-name': { value: P.string } } }, ({ name }) => name['credit-name'].value)
        .with({ name: { 'given-names': { value: P.string }, 'family-name': { value: P.string } } }, ({ name }) =>
          NonEmptyString(`${name['given-names'].value} ${name['family-name'].value}`),
        )
        .with({ name: { 'given-names': { value: P.string } } }, ({ name }) => name['given-names'].value)
        .with({ name: null }, { 'error-code': P.union(9018, 9044) }, () => undefined)
        .exhaustive(),
  ),
)

function addOrcidApiHeaders(request: F.Request) {
  return R.asks(({ orcidApiToken }: OrcidApiEnv) =>
    pipe(
      request,
      match(orcidApiToken)
        .with(P.string, token => F.setHeader('Authorization', `Bearer ${token}`))
        .with(undefined, () => identity)
        .exhaustive(),
    ),
  )
}

const orcidApiUrl = (path: string) => R.asks(({ orcidApiUrl }: OrcidApiEnv) => new URL(`/v3.0/${path}`, orcidApiUrl))
