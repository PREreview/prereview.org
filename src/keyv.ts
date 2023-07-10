import * as E from 'fp-ts/Either'
import type * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { flow } from 'fp-ts/function'
import type Keyv from 'keyv'
import type { Orcid } from 'orcid-id-ts'
import { type CareerStage, CareerStageC } from './career-stage'

type CareerStageStoreEnv = {
  careerStageStore: Keyv<string>
}

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
