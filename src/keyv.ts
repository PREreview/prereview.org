import * as E from 'fp-ts/Either'
import type { JsonRecord } from 'fp-ts/Json'
import type * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { constVoid, flow, pipe } from 'fp-ts/function'
import * as D from 'io-ts/Decoder'
import type Keyv from 'keyv'
import type { Orcid } from 'orcid-id-ts'
import { type CareerStage, CareerStageC } from './career-stage'
import { type ResearchInterests, ResearchInterestsC } from './research-interests'
import { NonEmptyStringC } from './string'

export interface CareerStageStoreEnv {
  careerStageStore: Keyv<string>
}

export interface ResearchInterestsStoreEnv {
  researchInterestsStore: Keyv<JsonRecord>
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

export const deleteResearchInterests = (
  orcid: Orcid,
): RTE.ReaderTaskEither<ResearchInterestsStoreEnv, 'unavailable', void> =>
  flow(
    TE.tryCatchK(
      env => env.researchInterestsStore.delete(orcid),
      () => 'unavailable' as const,
    ),
    TE.map(constVoid),
  )

export const getResearchInterests = (
  orcid: Orcid,
): RTE.ReaderTaskEither<ResearchInterestsStoreEnv, 'unavailable' | 'not-found', ResearchInterests> =>
  flow(
    TE.tryCatchK(
      env => env.researchInterestsStore.get(orcid),
      () => 'unavailable' as const,
    ),
    TE.chainEitherKW(
      flow(
        D.union(
          ResearchInterestsC,
          pipe(
            D.struct({ value: NonEmptyStringC }),
            D.map(value => ({ ...value, visibility: 'restricted' }) satisfies ResearchInterests),
          ),
          pipe(
            NonEmptyStringC,
            D.map(value => ({ value, visibility: 'restricted' }) satisfies ResearchInterests),
          ),
        ).decode,
        E.mapLeft(() => 'not-found' as const),
      ),
    ),
  )

export const saveResearchInterests = (
  orcid: Orcid,
  researchInterests: ResearchInterests,
): RTE.ReaderTaskEither<ResearchInterestsStoreEnv, 'unavailable', void> =>
  flow(
    TE.tryCatchK(
      env => env.researchInterestsStore.set(orcid, ResearchInterestsC.encode(researchInterests)),
      () => 'unavailable' as const,
    ),
    TE.map(constVoid),
  )
