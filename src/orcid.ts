import * as F from 'fetch-fp-ts'
import * as E from 'fp-ts/Either'
import * as J from 'fp-ts/Json'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import { NonEmptyStringC } from './string'

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      E.mapLeft(() => D.error(s, 'JSON')),
    ),
}

const PersonalDetailsD = D.struct({
  name: D.struct({
    'given-names': D.struct({
      value: NonEmptyStringC,
    }),
    'family-name': D.struct({
      value: NonEmptyStringC,
    }),
  }),
})

export const getNameFromOrcid = (orcid: Orcid): RTE.ReaderTaskEither<F.FetchEnv, 'not-found' | 'unavailable', string> =>
  match(orcid)
    .with('0000-0002-6109-0367' as Orcid, () =>
      pipe(
        'https://pub.orcid.org/v3.0/0000-0002-6109-0367/personal-details',
        F.Request('GET'),
        F.setHeader('Accept', 'application/json'),
        F.send,
        RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
        RTE.chainTaskEitherK(F.getText(identity)),
        RTE.chainEitherKW(JsonD.decode),
        RTE.chainEitherKW(PersonalDetailsD.decode),
        RTE.bimap(
          () => 'unavailable' as const,
          personalDetails =>
            `${personalDetails.name['given-names'].value} ${personalDetails.name['family-name'].value}`,
        ),
      ),
    )
    .otherwise(() => RTE.left('not-found' as const))
