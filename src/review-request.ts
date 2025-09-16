import { flow, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import * as D from 'io-ts/lib/Decoder.js'
import { match, P } from 'ts-pattern'
import type {
  AdvancePreprintId,
  AfricarxivUbuntunetPreprintId,
  ArxivPreprintId,
  BiorxivPreprintId,
  ChemrxivPreprintId,
  EartharxivPreprintId,
  EcoevorxivPreprintId,
  EdarxivPreprintId,
  EngrxivPreprintId,
  LifecycleJournalPreprintId,
  MedrxivPreprintId,
  MetaarxivPreprintId,
  NeurolibrePreprintId,
  OsfPreprintId,
  OsfPreprintsPreprintId,
  PreprintId,
  PreprintsorgPreprintId,
  PsyarxivPreprintId,
  ResearchSquarePreprintId,
  ScieloPreprintId,
  SocarxivPreprintId,
  TechrxivPreprintId,
  ZenodoPreprintId,
} from './Preprints/index.js'
import type { OrcidId } from './types/OrcidId.js'

export type ReviewRequest = IncompleteReviewRequest | CompletedReviewRequest

export type ReviewRequestPreprintId =
  | AdvancePreprintId
  | AfricarxivUbuntunetPreprintId
  | ArxivPreprintId
  | BiorxivPreprintId
  | ChemrxivPreprintId
  | EartharxivPreprintId
  | EcoevorxivPreprintId
  | EdarxivPreprintId
  | EngrxivPreprintId
  | LifecycleJournalPreprintId
  | MedrxivPreprintId
  | MetaarxivPreprintId
  | NeurolibrePreprintId
  | OsfPreprintId
  | OsfPreprintsPreprintId
  | PreprintsorgPreprintId
  | PsyarxivPreprintId
  | ResearchSquarePreprintId
  | ScieloPreprintId
  | SocarxivPreprintId
  | TechrxivPreprintId
  | ZenodoPreprintId

export interface IncompleteReviewRequest {
  readonly status: 'incomplete'
  readonly persona?: 'public' | 'pseudonym'
}

export interface CompletedReviewRequest {
  readonly status: 'completed'
}

export interface GetReviewRequestEnv {
  getReviewRequest: (
    orcid: OrcidId,
    preprint: ReviewRequestPreprintId,
  ) => TE.TaskEither<'not-found' | 'unavailable', ReviewRequest>
}

export interface SaveReviewRequestEnv {
  saveReviewRequest: (
    orcid: OrcidId,
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
  orcid: OrcidId,
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
  orcid: OrcidId,
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
        _tag: P.union(
          'AdvancePreprintId',
          'AfricarxivUbuntunetPreprintId',
          'ArxivPreprintId',
          'BiorxivPreprintId',
          'ChemrxivPreprintId',
          'EartharxivPreprintId',
          'EcoevorxivPreprintId',
          'EdarxivPreprintId',
          'EngrxivPreprintId',
          'LifecycleJournalPreprintId',
          'MedrxivPreprintId',
          'MetaarxivPreprintId',
          'NeurolibrePreprintId',
          'OsfPreprintId',
          'OsfPreprintsPreprintId',
          'PreprintsorgPreprintId',
          'PsyarxivPreprintId',
          'ResearchSquarePreprintId',
          'ScieloPreprintId',
          'SocarxivPreprintId',
          'TechrxivPreprintId',
          'ZenodoPreprintId',
        ),
      },
      () => true,
    )
    .otherwise(() => false)
}
