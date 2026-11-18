import { Array, Effect, Option, pipe, Predicate, Schedule } from 'effect'
import type * as EventDispatcher from '../../../EventDispatcher.ts'
import * as Preprints from '../../Preprints/index.ts'
import * as Queries from '../../../Queries.ts'
import { WasPrereviewRemoved } from '../WasPrereviewRemoved.ts'
import type {
  GetPublishedPreprintReview,
  PrereviewIsUnavailable,
  PublishedPreprintReview,
} from '../GetPublishedPreprintReview/index.ts'
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
      Effect.andThen(
        Effect.forEach(
          id =>
            pipe(
              Effect.retry(getPublishedPreprintReview(id), {
                while: error => Predicate.isTagged(error, 'PrereviewIsUnavailable') && !isNotAPreprint(error),
                schedule: Schedule.exponential('1 second'),
                times: 3,
              }),
              Effect.map(Option.some),
              Effect.catchIf(
                error => Predicate.isTagged(error, 'PrereviewIsUnavailable') && isNotAPreprint(error),
                error =>
                  Effect.as(
                    Effect.logWarning('Skipping a PREreview of something that is not a preprint').pipe(
                      Effect.annotateLogs({ id, error }),
                    ),
                    Option.none(),
                  ),
              ),
            ),
          { concurrency: 10 },
        ),
      ),
      Effect.map(Array.getSomes),
      Effect.catchTag(
        ['PrereviewIsNotFound', 'PrereviewIsUnavailable', 'PrereviewWasRemoved'],
        error => new PrereviewsAreUnavailable({ cause: error }),
      ),
      Effect.withSpan('PreprintReviews.getAllPublishedPreprintReviews'),
    )
  })

const isNotAPreprint = (error: PrereviewIsUnavailable): boolean =>
  error.cause instanceof Preprints.PreprintIsNotFound && error.cause.cause instanceof Preprints.NotAPreprint
