import { hasRegistrant } from 'doi-ts'
import { flow, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import type { Orcid } from 'orcid-id-ts'
import { match, P } from 'ts-pattern'
import type {
  AfricarxivUbuntunetPreprintId,
  ArxivPreprintId,
  BiorxivPreprintId,
  EartharxivPreprintId,
  EcoevorxivPreprintId,
  EdarxivPreprintId,
  MedrxivPreprintId,
  MetaarxivPreprintId,
  OsfPreprintsPreprintId,
  PreprintId,
  PreprintsorgPreprintId,
  PsyarxivPreprintId,
  ScieloPreprintId,
  SocarxivPreprintId,
} from './types/preprint-id.js'

export type ReviewRequest = IncompleteReviewRequest | CompletedReviewRequest

export type ReviewRequestPreprintId =
  | AfricarxivUbuntunetPreprintId
  | ArxivPreprintId
  | BiorxivPreprintId
  | EartharxivPreprintId
  | EcoevorxivPreprintId
  | EdarxivPreprintId
  | MedrxivPreprintId
  | MetaarxivPreprintId
  | OsfPreprintsPreprintId
  | PreprintsorgPreprintId
  | PsyarxivPreprintId
  | ScieloPreprintId
  | SocarxivPreprintId

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
  return match(preprint)
    .with(
      {
        type: P.union(
          'arxiv',
          'biorxiv',
          'eartharxiv',
          'ecoevorxiv',
          'edarxiv',
          'medrxiv',
          'metaarxiv',
          'osf-preprints',
          'preprints.org',
          'psyarxiv',
          'scielo',
          'socarxiv',
        ),
      },
      () => true,
    )
    .with(
      { type: 'africarxiv' },
      preprint => hasRegistrant('60763')(preprint.value),
      () => true,
    )
    .otherwise(() => false)
}
