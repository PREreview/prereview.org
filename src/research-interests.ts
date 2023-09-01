import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import type { Orcid } from 'orcid-id-ts'
import type { NonEmptyString } from './string'

export interface GetResearchInterestsEnv {
  getResearchInterests: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', NonEmptyString>
}

export interface EditResearchInterestsEnv extends GetResearchInterestsEnv {
  deleteResearchInterests: (orcid: Orcid) => TE.TaskEither<'unavailable', void>
  saveResearchInterests: (orcid: Orcid, researchInterests: NonEmptyString) => TE.TaskEither<'unavailable', void>
}

export const getResearchInterests = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ getResearchInterests }: GetResearchInterestsEnv) => getResearchInterests(orcid)),
  )

export const deleteResearchInterests = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ deleteResearchInterests }: EditResearchInterestsEnv) => deleteResearchInterests(orcid)),
  )

export const saveResearchInterests = (orcid: Orcid, researchInterests: NonEmptyString) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ saveResearchInterests }: EditResearchInterestsEnv) =>
      saveResearchInterests(orcid, researchInterests),
    ),
  )
