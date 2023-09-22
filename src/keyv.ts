import * as E from 'fp-ts/Either'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { flow, identity, pipe } from 'fp-ts/function'
import type { Decoder } from 'io-ts/Decoder'
import * as D from 'io-ts/Decoder'
import type { Encoder } from 'io-ts/Encoder'
import type Keyv from 'keyv'
import type { Orcid } from 'orcid-id-ts'
import { CareerStageC } from './career-stage'
import { IsOpenForRequestsC } from './is-open-for-requests'
import { type ResearchInterests, ResearchInterestsC } from './research-interests'
import { NonEmptyStringC } from './string'

export interface CareerStageStoreEnv {
  careerStageStore: Keyv<unknown>
}

export interface IsOpenForRequestsStoreEnv {
  isOpenForRequestsStore: Keyv<unknown>
}

export interface ResearchInterestsStoreEnv {
  researchInterestsStore: Keyv<unknown>
}

export interface SlackUserIdStoreEnv {
  slackUserIdStore: Keyv<unknown>
}

const OrcidE: Encoder<string, Orcid> = { encode: identity }

const deleteKey =
  <K>(keyEncoder: Encoder<string, K>) =>
  (key: K): RTE.ReaderTaskEither<Keyv<unknown>, 'unavailable', void> =>
    TE.tryCatchK(
      async keyv => {
        await keyv.delete(keyEncoder.encode(key))
      },
      () => 'unavailable' as const,
    )

const getKey =
  <K, V>(keyEncoder: Encoder<string, K>, valueDecoder: Decoder<unknown, V>) =>
  (key: K): RTE.ReaderTaskEither<Keyv<unknown>, 'unavailable' | 'not-found', V> =>
    flow(
      TE.tryCatchK(
        keyv => keyv.get(keyEncoder.encode(key)),
        () => 'unavailable' as const,
      ),
      TE.chainEitherKW(
        flow(
          valueDecoder.decode,
          E.mapLeft(() => 'not-found' as const),
        ),
      ),
    )

const setKey =
  <K, V>(keyEncoder: Encoder<string, K>, valueEncoder: Encoder<unknown, V>) =>
  (key: K, value: V): RTE.ReaderTaskEither<Keyv<unknown>, 'unavailable', void> =>
    TE.tryCatchK(
      async keyv => {
        await keyv.set(keyEncoder.encode(key), valueEncoder.encode(value))
      },
      () => 'unavailable' as const,
    )

export const deleteCareerStage = flow(
  deleteKey(OrcidE),
  RTE.local((env: CareerStageStoreEnv) => env.careerStageStore),
)

export const getCareerStage = flow(
  getKey(OrcidE, CareerStageC),
  RTE.local((env: CareerStageStoreEnv) => env.careerStageStore),
)

export const saveCareerStage = flow(
  setKey(OrcidE, CareerStageC),
  RTE.local((env: CareerStageStoreEnv) => env.careerStageStore),
)

export const isOpenForRequests = flow(
  getKey(OrcidE, IsOpenForRequestsC),
  RTE.local((env: IsOpenForRequestsStoreEnv) => env.isOpenForRequestsStore),
)

export const saveOpenForRequests = flow(
  setKey(OrcidE, IsOpenForRequestsC),
  RTE.local((env: IsOpenForRequestsStoreEnv) => env.isOpenForRequestsStore),
)

export const deleteResearchInterests = flow(
  deleteKey(OrcidE),
  RTE.local((env: ResearchInterestsStoreEnv) => env.researchInterestsStore),
)

export const getResearchInterests = flow(
  getKey(
    OrcidE,
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
    ),
  ),
  RTE.local((env: ResearchInterestsStoreEnv) => env.researchInterestsStore),
)

export const saveResearchInterests = flow(
  setKey(OrcidE, ResearchInterestsC),
  RTE.local((env: ResearchInterestsStoreEnv) => env.researchInterestsStore),
)

export const getSlackUserId = flow(
  getKey(OrcidE, NonEmptyStringC),
  RTE.local((env: SlackUserIdStoreEnv) => env.slackUserIdStore),
)

export const saveSlackUserId = flow(
  setKey(OrcidE, NonEmptyStringC),
  RTE.local((env: SlackUserIdStoreEnv) => env.slackUserIdStore),
)
