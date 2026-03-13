import { flow, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match } from 'ts-pattern'
import type { PreprintId } from './Preprints/index.ts'
import type { OrcidId } from './types/OrcidId.ts'
import { Uuid } from './types/index.ts'

export type ReviewRequest = IncompleteReviewRequest | CompletedReviewRequest

export interface IncompleteReviewRequest {
  readonly status: 'incomplete'
  readonly persona?: 'public' | 'pseudonym'
  readonly id: Uuid.Uuid
}

export interface CompletedReviewRequest {
  readonly status: 'completed'
}

export interface GetReviewRequestEnv {
  getReviewRequest: (orcid: OrcidId, preprint: PreprintId) => TE.TaskEither<'not-found' | 'unavailable', ReviewRequest>
}

export interface SaveReviewRequestEnv {
  saveReviewRequest: (
    orcid: OrcidId,
    preprint: PreprintId,
    reviewRequest: ReviewRequest,
  ) => TE.TaskEither<'unavailable', void>
}

const IncompleteReviewRequestC = pipe(
  C.struct({
    status: C.literal('incomplete'),
    id: Uuid.UuidC,
  }),
  C.intersect(
    C.partial({
      persona: C.literal('public', 'pseudonym'),
    }),
  ),
) satisfies C.Codec<unknown, unknown, IncompleteReviewRequest>

const CompletedReviewRequestC = C.struct({
  status: C.literal('completed'),
}) satisfies C.Codec<unknown, unknown, CompletedReviewRequest>

// Unfortunately, there's no way to describe a union encoder, so we must implement it ourselves.
// Refs https://github.com/gcanti/io-ts/issues/625#issuecomment-1007478009
export const ReviewRequestC = C.make(D.union(IncompleteReviewRequestC, CompletedReviewRequestC), {
  encode: reviewRequest =>
    match(reviewRequest)
      .with({ status: 'incomplete' }, IncompleteReviewRequestC.encode)
      .with({ status: 'completed' }, CompletedReviewRequestC.encode)
      .exhaustive(),
}) satisfies C.Codec<unknown, unknown, ReviewRequest>

export const getReviewRequest = (
  orcid: OrcidId,
  preprint: PreprintId,
): RTE.ReaderTaskEither<GetReviewRequestEnv, 'not-found' | 'unavailable', ReviewRequest> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ getReviewRequest }) => getReviewRequest(orcid, preprint)))

export const maybeGetReviewRequest = flow(
  getReviewRequest,
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(undefined))
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)

export const saveReviewRequest = (
  orcid: OrcidId,
  preprint: PreprintId,
  reviewRequest: ReviewRequest,
): RTE.ReaderTaskEither<SaveReviewRequestEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ saveReviewRequest }) => saveReviewRequest(orcid, preprint, reviewRequest)),
  )
