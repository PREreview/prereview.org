import { Array, Context, Effect, flow, Option, pipe, Scope, Struct, Tuple } from 'effect'
import type * as EventDispatcher from '../../../EventDispatcher.ts'
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
import { RecentDatasetPrereview, RecentPreprintPrereview } from '../Prereview.ts'
import { ListRecentPrereviewIds, RecentPrereviewId } from './ListRecentPrereviewIds.ts'

export type GetFiveMostRecentPrereviews = Effect.Effect<ReadonlyArray<RecentPreprintPrereview | RecentDatasetPrereview>>

export const GetFiveMostRecentPrereviews: Effect.Effect<
  GetFiveMostRecentPrereviews,
  never,
  DatasetReviewQueries | EventDispatcher.EventDispatcher | PreprintReviews | WasPrereviewRemoved
> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<DatasetReviewQueries | PreprintReviews>(), Context.omit(Scope.Scope))
  const wasPrereviewRemoved = yield* WasPrereviewRemoved
  const listRecentPrereviewIds = yield* Queries.makeStatefulQuery(ListRecentPrereviewIds(wasPrereviewRemoved))

  return pipe(
    listRecentPrereviewIds(5),
    Effect.andThen(
      Effect.partition(
        RecentPrereviewId.$match({
          PreprintReview: ({ id }) => getRecentPreprintPrereview(id),
          DatasetReview: ({ id }) => getRecentDatasetPrereview(id),
        }),
        { concurrency: 'unbounded' },
      ),
    ),
    Effect.map(Tuple.get(0)),
    Effect.provideContext(context),
    Effect.withSpan('Prereviews.getFiveMostRecentPrereviews'),
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
