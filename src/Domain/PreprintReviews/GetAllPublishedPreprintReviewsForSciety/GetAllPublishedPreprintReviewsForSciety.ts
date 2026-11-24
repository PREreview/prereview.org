import { Context, Effect, pipe, Predicate, Schedule, Scope } from 'effect'
import type * as EventDispatcher from '../../../EventDispatcher.ts'
import * as Queries from '../../../Queries.ts'
import { Prereviewers } from '../../Prereviewers/index.ts'
import { WasPrereviewRemoved } from '../WasPrereviewRemoved.ts'
import { ListPreprintReviewsForSciety, type PreprintReviewForSciety } from './ListPreprintReviewsForSciety.ts'
import { PrereviewsAreUnavailable, type PublishedPreprintReviewForSciety } from './Types.ts'

export type GetAllPublishedPreprintReviewsForSciety = Effect.Effect<
  ReadonlyArray<PublishedPreprintReviewForSciety>,
  PrereviewsAreUnavailable
>

export const GetAllPublishedPreprintReviewsForSciety: Effect.Effect<
  GetAllPublishedPreprintReviewsForSciety,
  never,
  EventDispatcher.EventDispatcher | Prereviewers | WasPrereviewRemoved
> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<Prereviewers>(), Context.omit(Scope.Scope))

  const wasPrereviewRemoved = yield* WasPrereviewRemoved
  const listPreprintReviewsForSciety = yield* Queries.makeStatefulQuery(
    ListPreprintReviewsForSciety(wasPrereviewRemoved),
  )

  return pipe(
    listPreprintReviewsForSciety(),
    Effect.andThen(
      Effect.forEach(
        review =>
          Effect.retry(getAuthors(review), {
            while: Predicate.isTagged('UnableToGetPersona'),
            schedule: Schedule.exponential('1 second'),
            times: 3,
          }),
        { concurrency: 10 },
      ),
    ),
    Effect.catchTag(['UnableToGetPersona', 'UnableToQuery'], error => new PrereviewsAreUnavailable({ cause: error })),
    Effect.provideContext(context),
    Effect.withSpan('PreprintReviews.getAllPublishedPreprintReviewsForSciety'),
  )
})

const getAuthors = (review: PreprintReviewForSciety) =>
  Effect.map(
    Effect.forEach(review.authors, Prereviewers.getPersona, { concurrency: 'unbounded' }),
    authors => ({ ...review, authors }) satisfies PublishedPreprintReviewForSciety,
  )
