import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { flow } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import { type NonEmptyString, NonEmptyStringC } from './string'

export interface ResearchInterests {
  readonly value: NonEmptyString
  readonly visibility: 'public' | 'restricted'
}

export interface GetResearchInterestsEnv {
  getResearchInterests: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', ResearchInterests>
}

export interface EditResearchInterestsEnv extends GetResearchInterestsEnv {
  deleteResearchInterests: (orcid: Orcid) => TE.TaskEither<'unavailable', void>
  saveResearchInterests: (orcid: Orcid, researchInterests: ResearchInterests) => TE.TaskEither<'unavailable', void>
}

export const ResearchInterestsC = C.struct({
  value: NonEmptyStringC,
  visibility: C.literal('public', 'restricted'),
}) satisfies C.Codec<unknown, unknown, ResearchInterests>

export const getResearchInterests = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ getResearchInterests }: GetResearchInterestsEnv) => getResearchInterests(orcid)),
  )

export const maybeGetResearchInterests = flow(
  getResearchInterests,
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(undefined))
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)

export const deleteResearchInterests = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ deleteResearchInterests }: EditResearchInterestsEnv) => deleteResearchInterests(orcid)),
  )

export const saveResearchInterests = (
  orcid: Orcid,
  researchInterests: ResearchInterests,
): RTE.ReaderTaskEither<EditResearchInterestsEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ saveResearchInterests }) => saveResearchInterests(orcid, researchInterests)),
  )
