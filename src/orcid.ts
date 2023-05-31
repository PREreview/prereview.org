import * as F from 'fetch-fp-ts'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { identity, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'

export const getNameFromOrcid = (orcid: Orcid): RTE.ReaderTaskEither<F.FetchEnv, 'not-found' | 'unavailable', string> =>
  match(orcid)
    .with('0000-0002-6109-0367' as Orcid, () =>
      pipe(
        'https://pub.orcid.org/v3.0/0000-0002-6109-0367/personal-details',
        F.Request('GET'),
        F.send,
        RTE.filterOrElseW(F.hasStatus(Status.OK), identity),
        RTE.bimap(
          () => 'unavailable' as const,
          () => 'Daniela Saderi',
        ),
      ),
    )
    .otherwise(() => RTE.left('not-found' as const))
