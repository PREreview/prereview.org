import { flow } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import { match } from 'ts-pattern'
import type { OrcidId } from '../types/OrcidId.ts'

export interface CareerStage {
  readonly value: 'early' | 'mid' | 'late'
  readonly visibility: 'public' | 'restricted'
}

export interface GetCareerStageEnv {
  getCareerStage: (orcid: OrcidId) => TE.TaskEither<'not-found' | 'unavailable', CareerStage>
}

export const CareerStageC = C.struct({
  value: C.literal('early', 'mid', 'late'),
  visibility: C.literal('public', 'restricted'),
}) satisfies C.Codec<unknown, unknown, CareerStage>

export const getCareerStage = (
  orcid: OrcidId,
): RTE.ReaderTaskEither<GetCareerStageEnv, 'not-found' | 'unavailable', CareerStage> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getCareerStage }) => getCareerStage(orcid)))

export const maybeGetCareerStage = flow(
  getCareerStage,
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(undefined))
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)
