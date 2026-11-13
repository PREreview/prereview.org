import { flow } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import { match } from 'ts-pattern'
import { type NonEmptyString, NonEmptyStringC } from '../../types/NonEmptyString.ts'
import type { OrcidId } from '../../types/OrcidId.ts'

export interface Languages {
  readonly value: NonEmptyString
  readonly visibility: 'public' | 'restricted'
}

export interface GetLanguagesEnv {
  getLanguages: (orcid: OrcidId) => TE.TaskEither<'not-found' | 'unavailable', Languages>
}

export const LanguagesC = C.struct({
  value: NonEmptyStringC,
  visibility: C.literal('public', 'restricted'),
}) satisfies C.Codec<unknown, unknown, Languages>

export const getLanguages = (
  orcid: OrcidId,
): RTE.ReaderTaskEither<GetLanguagesEnv, 'not-found' | 'unavailable', Languages> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getLanguages }) => getLanguages(orcid)))

export const maybeGetLanguages = flow(
  getLanguages,
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(undefined))
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)
