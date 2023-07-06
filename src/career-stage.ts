import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import * as C from 'io-ts/Codec'
import type { Orcid } from 'orcid-id-ts'

export type CareerStage = 'early' | 'mid' | 'late'

export interface GetCareerStageEnv {
  getCareerStage: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', CareerStage>
}

export interface EditCareerStageEnv extends GetCareerStageEnv {
  deleteCareerStage: (orcid: Orcid) => TE.TaskEither<'unavailable', void>
  saveCareerStage: (orcid: Orcid, careerStage: CareerStage) => TE.TaskEither<'unavailable', void>
}

export const CareerStageC: C.Codec<unknown, string, CareerStage> = C.literal('early', 'mid', 'late')

export const getCareerStage = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getCareerStage }: GetCareerStageEnv) => getCareerStage(orcid)))

export const deleteCareerStage = (orcid: Orcid) =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ deleteCareerStage }: EditCareerStageEnv) => deleteCareerStage(orcid)))

export const saveCareerStage = (orcid: Orcid, careerStage: CareerStage) =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ saveCareerStage }: EditCareerStageEnv) => saveCareerStage(orcid, careerStage)),
  )
