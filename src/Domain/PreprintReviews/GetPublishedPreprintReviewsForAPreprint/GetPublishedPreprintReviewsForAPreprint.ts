import { Effect, pipe, Schema } from 'effect'
import type * as EventDispatcher from '../../../EventDispatcher.ts'
import * as Queries from '../../../Queries.ts'
import { type IndeterminatePreprintId, IndeterminatePreprintIdFromStringSchema } from '../../Preprints/index.ts'
import { WasPrereviewRemoved } from '../../Prereviews/index.ts'
import type { GetPublishedPreprintReview, PublishedPreprintReview } from '../GetPublishedPreprintReview/index.ts'
import { ListPreprintReviewIds } from './ListPreprintReviewIds.ts'
import { PrereviewsAreUnavailable } from './Types.ts'

export type GetPublishedPreprintReviewsForAPreprint = (
  preprintId: IndeterminatePreprintId,
) => Effect.Effect<ReadonlyArray<PublishedPreprintReview>, PrereviewsAreUnavailable>

export const GetPublishedPreprintReviewsForAPreprint = (
  getPublishedPreprintReview: GetPublishedPreprintReview,
): Effect.Effect<
  GetPublishedPreprintReviewsForAPreprint,
  never,
  EventDispatcher.EventDispatcher | WasPrereviewRemoved
> =>
  Effect.gen(function* () {
    const wasPrereviewRemoved = yield* WasPrereviewRemoved
    const listPreprintReviewIds = yield* Queries.makeStatefulQuery(ListPreprintReviewIds(wasPrereviewRemoved))

    return (preprintId: IndeterminatePreprintId) =>
      pipe(
        listPreprintReviewIds(preprintId),
        Effect.andThen(Effect.forEach(getPublishedPreprintReview, { concurrency: 'unbounded' })),
        Effect.catchTag(
          ['PrereviewIsNotFound', 'PrereviewIsUnavailable', 'PrereviewWasRemoved'],
          error => new PrereviewsAreUnavailable({ cause: error }),
        ),
        Effect.withSpan('PreprintReviews.getPublishedPreprintReviewsForAPreprint', {
          attributes: { preprintId: Schema.encodeSync(IndeterminatePreprintIdFromStringSchema)(preprintId) },
        }),
      )
  })
