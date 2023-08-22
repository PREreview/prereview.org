import * as E from 'fp-ts/Either'
import type * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { constVoid, flow } from 'fp-ts/function'
import type Keyv from 'keyv'
import type { Orcid } from 'orcid-id-ts'
import { type CareerStage, CareerStageC } from './career-stage'

export interface CareerStageStoreEnv {
  careerStageStore: Keyv<string>
}

export const deleteCareerStage = (orcid: Orcid): RTE.ReaderTaskEither<CareerStageStoreEnv, 'unavailable', void> =>
  flow(
    TE.tryCatchK(
      env => env.careerStageStore.delete(orcid),
      () => 'unavailable' as const,
    ),
    TE.map(constVoid),
  )

export const getCareerStage = (
  orcid: Orcid,
): RTE.ReaderTaskEither<CareerStageStoreEnv, 'unavailable' | 'not-found', CareerStage> =>
  flow(
    TE.tryCatchK(
      env => env.careerStageStore.get(orcid),
      () => 'unavailable' as const,
    ),
    TE.chainEitherKW(
      flow(
        CareerStageC.decode,
        E.mapLeft(() => 'not-found' as const),
      ),
    ),
  )

export const saveCareerStage = (
  orcid: Orcid,
  careerStage: CareerStage,
): RTE.ReaderTaskEither<CareerStageStoreEnv, 'unavailable', void> =>
  flow(
    TE.tryCatchK(
      env => env.careerStageStore.set(orcid, CareerStageC.encode(careerStage)),
      () => 'unavailable' as const,
    ),
    TE.map(constVoid),
  )
