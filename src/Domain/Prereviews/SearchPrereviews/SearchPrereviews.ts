import { Array, Context, Effect, flow, Option, pipe, Scope, Struct } from 'effect'
import type { StatefulQueries } from '../../../EventSourcing/index.ts'
import * as Queries from '../../../Queries.ts'
import { getTopicField, getTopicSubfield } from '../../../types/Topic.ts'
import { DatasetReviewQueries } from '../../DatasetReviews/index.ts'
import * as Datasets from '../../Datasets/index.ts'
import {
  getPreprintReview,
  type PreprintReviews,
  type Prereview,
  WasPrereviewRemoved,
} from '../../PreprintReviews/index.ts'
import { RecentDatasetPrereview, RecentPreprintPrereview, type RecentPrereviews } from '../Prereview.ts'
import { type Input, ListMatchingPrereviewIds, MatchingPrereviewId } from './ListMatchingPrereviewIds.ts'
import { PrereviewsAreUnavailable, PrereviewsPageNotFound } from './Types.ts'

export type SearchPrereviews = (
  input: Input,
) => Effect.Effect<RecentPrereviews, PrereviewsAreUnavailable | PrereviewsPageNotFound>

export const SearchPrereviews: Effect.Effect<
  SearchPrereviews,
  never,
  DatasetReviewQueries | StatefulQueries.StatefulQueries | PreprintReviews | WasPrereviewRemoved
> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<DatasetReviewQueries | PreprintReviews>(), Context.omit(Scope.Scope))
  const wasPrereviewRemoved = yield* WasPrereviewRemoved
  const listMatchingPrereviewIds = yield* Queries.makeStatefulQuery(ListMatchingPrereviewIds(wasPrereviewRemoved))

  return (input: Input) =>
    pipe(
      listMatchingPrereviewIds(input),
      Effect.andThen(({ currentPage, totalPages, ids }) =>
        pipe(
          Effect.forEach(
            ids,
            MatchingPrereviewId.$match({
              PreprintReview: ({ id }) => getRecentPreprintPrereview(id),
              DatasetReview: ({ id }) => getRecentDatasetPrereview(id),
            }),
            { concurrency: 'unbounded' },
          ),
          Effect.map(
            recentPrereviews =>
              ({
                currentPage,
                totalPages,
                ...Struct.pick(input, ['field', 'language']),
                recentPrereviews,
              }) satisfies RecentPrereviews,
          ),
        ),
      ),
      Effect.catchTag(
        [
          'DatasetReviewHasNotBeenPublished',
          'DatasetReviewIsUnavailable',
          'PrereviewIsNotFound',
          'PrereviewIsUnavailable',
          'PrereviewWasRemoved',
          'UnableToQuery',
          'UnknownDatasetReview',
        ],
        error => new PrereviewsAreUnavailable({ cause: error }),
      ),
      Effect.catchTag('PageNotFound', error => new PrereviewsPageNotFound({ cause: error })),
      Effect.provideContext(context),
      Effect.withSpan('Prereviews.searchPrereviews'),
    )
})

const getRecentPreprintPrereview = flow(
  getPreprintReview,
  Effect.map(
    (prereview: Prereview) =>
      new RecentPreprintPrereview({
        id: prereview.id,
        club: prereview.club,
        reviewers: {
          named: Array.map(prereview.authors.named, Struct.get('name')),
          anonymous: prereview.authors.anonymous,
        },
        published: prereview.published,
        fields: Array.dedupe(Array.map(prereview.topics ?? [], getTopicField)),
        subfields: Array.dedupe(Array.map(prereview.topics ?? [], getTopicSubfield)),
        preprint: {
          id: prereview.preprint.id,
          language: prereview.preprint.language,
          title: prereview.preprint.title,
        },
      }),
  ),
)

const getRecentDatasetPrereview = flow(
  DatasetReviewQueries.getPublishedDatasetReview,
  Effect.map(
    datasetReview =>
      new RecentDatasetPrereview({
        author: datasetReview.author,
        otherAuthors: datasetReview.otherAuthors,
        anonymousAuthors: datasetReview.anonymousAuthors,
        club: Option.getOrUndefined(datasetReview.club),
        dataset: Datasets.DatasetTitle.fromDataset(datasetReview.dataset),
        doi: datasetReview.doi,
        id: datasetReview.id,
        published: datasetReview.published,
      }),
  ),
)
