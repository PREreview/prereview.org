import { Effect, pipe } from 'effect'
import type * as EventDispatcher from '../../../EventDispatcher.ts'
import * as Queries from '../../../Queries.ts'
import { WasPrereviewRemoved } from '../WasPrereviewRemoved.ts'
import type { GetPublishedPreprintReview, PublishedPreprintReview } from '../GetPublishedPreprintReview/index.ts'
import { ListAllPreprintReviewIds } from './ListAllPreprintReviewIds.ts'
import { PrereviewsAreUnavailable } from './Types.ts'

export type GetAllPublishedPreprintReviews = Effect.Effect<
  ReadonlyArray<PublishedPreprintReview>,
  PrereviewsAreUnavailable
>

export const GetAllPublishedPreprintReviews = (
  getPublishedPreprintReview: GetPublishedPreprintReview,
): Effect.Effect<GetAllPublishedPreprintReviews, never, EventDispatcher.EventDispatcher | WasPrereviewRemoved> =>
  Effect.gen(function* () {
    const wasPrereviewRemoved = yield* WasPrereviewRemoved
    const listAllPreprintReviewIds = yield* Queries.makeStatefulQuery(ListAllPreprintReviewIds(wasPrereviewRemoved))

    return pipe(
      listAllPreprintReviewIds(),
      Effect.andThen(Effect.forEach(getPublishedPreprintReview, { concurrency: 10 })),
      Effect.catchTag(
        ['PrereviewIsNotFound', 'PrereviewIsUnavailable', 'PrereviewWasRemoved'],
        error => new PrereviewsAreUnavailable({ cause: error }),
      ),
      Effect.withSpan('PreprintReviews.getAllPublishedPreprintReviews'),
    )
  })
