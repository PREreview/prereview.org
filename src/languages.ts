import { flow } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import { match } from 'ts-pattern'
import { type NonEmptyString, NonEmptyStringC } from './types/NonEmptyString.js'
import type { Orcid } from './types/Orcid.js'

export interface Languages {
  readonly value: NonEmptyString
  readonly visibility: 'public' | 'restricted'
}

export interface GetLanguagesEnv {
  getLanguages: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', Languages>
}

export interface EditLanguagesEnv extends GetLanguagesEnv {
  deleteLanguages: (orcid: Orcid) => TE.TaskEither<'unavailable', void>
  saveLanguages: (orcid: Orcid, languages: Languages) => TE.TaskEither<'unavailable', void>
}

export const LanguagesC = C.struct({
  value: NonEmptyStringC,
  visibility: C.literal('public', 'restricted'),
}) satisfies C.Codec<unknown, unknown, Languages>

export const getLanguages = (
  orcid: Orcid,
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

export const deleteLanguages = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ deleteLanguages }: EditLanguagesEnv) => deleteLanguages(orcid)))

export const saveLanguages = (
  orcid: Orcid,
  languages: Languages,
): RTE.ReaderTaskEither<EditLanguagesEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ saveLanguages }) => saveLanguages(orcid, languages)))
