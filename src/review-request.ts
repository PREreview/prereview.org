import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import * as D from 'io-ts/Decoder'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import type {
  ArxivPreprintId,
  BiorxivPreprintId,
  EdarxivPreprintId,
  MedrxivPreprintId,
  PreprintId,
  ScieloPreprintId,
} from './types/preprint-id'

export type ReviewRequest = IncompleteReviewRequest | CompletedReviewRequest

export type ReviewRequestPreprintId =
  | ArxivPreprintId
  | BiorxivPreprintId
  | EdarxivPreprintId
  | MedrxivPreprintId
  | ScieloPreprintId

export interface IncompleteReviewRequest {
  readonly status: 'incomplete'
  readonly persona?: 'public' | 'pseudonym'
}

export interface CompletedReviewRequest {
  readonly status: 'completed'
}

export interface GetReviewRequestEnv {
  getReviewRequest: (
    orcid: Orcid,
    preprint: ReviewRequestPreprintId,
  ) => TE.TaskEither<'not-found' | 'unavailable', ReviewRequest>
}

export interface SaveReviewRequestEnv {
  saveReviewRequest: (
    orcid: Orcid,
    preprint: ReviewRequestPreprintId,
    reviewRequest: ReviewRequest,
  ) => TE.TaskEither<'unavailable', void>
}

const IncompleteReviewRequestC = pipe(
  C.struct({
    status: C.literal('incomplete'),
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
  orcid: Orcid,
  preprint: ReviewRequestPreprintId,
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
  orcid: Orcid,
  preprint: ReviewRequestPreprintId,
  reviewRequest: ReviewRequest,
): RTE.ReaderTaskEither<SaveReviewRequestEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(
    RTE.fromTaskEitherK(({ saveReviewRequest }) => saveReviewRequest(orcid, preprint, reviewRequest)),
  )

export function isReviewRequestPreprintId(preprint: PreprintId): preprint is ReviewRequestPreprintId {
  return match(preprint.type)
    .with('arxiv', 'biorxiv', 'edarxiv', 'medrxiv', 'scielo', () => true)
    .otherwise(() => false)
}
