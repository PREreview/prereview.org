import { Array, Context, Effect, Option, pipe, Predicate, Schedule, Scope } from 'effect'
import type { StatefulQueries } from '../../../EventSourcing/index.ts'
import { Queries } from '../../Events/index.ts'
import * as Preprints from '../../Preprints/index.ts'
import { Prereviewers } from '../../Prereviewers/index.ts'
import { WasPrereviewRemoved } from '../WasPrereviewRemoved.ts'
import {
  ListPreprintReviewsForReviewsData,
  type PreprintReviewForReviewsData,
} from './ListPreprintReviewsForReviewsData.ts'
import { PrereviewsAreUnavailable, type PublishedPreprintReviewForReviewsData } from './Types.ts'
import { WasAReviewRequested } from './WasAReviewRequested.ts'

export type GetAllPublishedPreprintReviewsForReviewsData = Effect.Effect<
  ReadonlyArray<PublishedPreprintReviewForReviewsData>,
  PrereviewsAreUnavailable
>

export const GetAllPublishedPreprintReviewsForReviewsData: Effect.Effect<
  GetAllPublishedPreprintReviewsForReviewsData,
  never,
  StatefulQueries.StatefulQueries | Preprints.Preprints | Prereviewers | WasPrereviewRemoved
> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<Preprints.Preprints | Prereviewers>(), Context.omit(Scope.Scope))

  const wasPrereviewRemoved = yield* WasPrereviewRemoved
  const listPreprintReviewsForReviewsData = yield* Queries.makeStatefulQuery(
    ListPreprintReviewsForReviewsData(wasPrereviewRemoved),
  )
  const wasAReviewRequested = yield* Queries.makeStatefulQuery(WasAReviewRequested)

  const addDetails = (review: PreprintReviewForReviewsData) =>
    Effect.gen(function* () {
      const { preprint, authors, requested } = yield* Effect.all(
        {
          preprint: Preprints.getPreprintId(review.preprint),
          authors: Effect.forEach(review.authors, getAuthor),
          requested: wasAReviewRequested({ preprintId: review.preprint, published: review.published }),
        },
        { concurrency: 'unbounded' },
      )

      return { ...review, preprint, authors, requested } satisfies PublishedPreprintReviewForReviewsData
    })

  return pipe(
    listPreprintReviewsForReviewsData(),
    Effect.andThen(
      Effect.forEach(
        review =>
          pipe(
            Effect.retry(addDetails(review), {
              while: Predicate.isTagged('PreprintIsUnavailable'),
              schedule: Schedule.exponential('1 second'),
              times: 3,
            }),
            Effect.map(Option.some),
            Effect.catchTag('NotAPreprint', error =>
              Effect.as(
                Effect.logWarning('Skipping a PREreview of something that is not a preprint').pipe(
                  Effect.annotateLogs({ id: review.id, error }),
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
      ['PreprintIsNotFound', 'PreprintIsUnavailable', 'UnableToQuery', 'UnknownPrereviewer'],
      error => new PrereviewsAreUnavailable({ cause: error }),
    ),
    Effect.provideContext(context),
    Effect.withSpan('PreprintReviews.getAllPublishedPreprintReviewsForReviewsData'),
  )
})

const getAuthor = (
  author: PreprintReviewForReviewsData['authors'][number],
): Effect.Effect<
  PublishedPreprintReviewForReviewsData['authors'][number],
  Effect.Error<ReturnType<typeof Prereviewers.getPseudonym>>,
  Prereviewers
> =>
  author.persona === 'public'
    ? Effect.succeed({ _tag: 'Public', orcidId: author.orcidId })
    : Effect.map(Prereviewers.getPseudonym(author.orcidId), pseudonym => ({ _tag: 'Pseudonym', pseudonym }))
