import { Array, Context, Effect, flow, Option, pipe, Scope, Struct } from 'effect'
import type { Uuid } from '../../../types/index.ts'
import { getTopicField, getTopicSubfield } from '../../../types/Topic.ts'
import { DatasetReviewQueries } from '../../DatasetReviews/index.ts'
import * as Datasets from '../../Datasets/index.ts'
import { getPreprintReview, type PreprintReviews, type Prereview } from '../../PreprintReviews/index.ts'
import {
  PrereviewIsNotFound,
  PrereviewIsUnavailable,
  type PrereviewWasRemoved,
  RecentDatasetPrereview,
  RecentPreprintPrereview,
} from '../Prereview.ts'

export type GetPrereviewSummary = (
  id: number | Uuid.Uuid,
) => Effect.Effect<
  RecentPreprintPrereview | RecentDatasetPrereview,
  PrereviewIsNotFound | PrereviewIsUnavailable | PrereviewWasRemoved
>

export const GetPrereviewSummary: Effect.Effect<GetPrereviewSummary, never, DatasetReviewQueries | PreprintReviews> =
  Effect.gen(function* () {
    const context = yield* Effect.map(
      Effect.context<DatasetReviewQueries | PreprintReviews>(),
      Context.omit(Scope.Scope),
    )

    return id =>
      pipe(
        Effect.gen(function* () {
          if (typeof id === 'number') {
            return yield* getRecentPreprintPrereview(id)
          }

          return yield* getRecentDatasetPrereview(id)
        }),
        Effect.catchTag(['UnknownDatasetReview', 'DatasetReviewHasNotBeenPublished'], () => new PrereviewIsNotFound()),
        Effect.catchTag('DatasetReviewIsUnavailable', error => new PrereviewIsUnavailable({ cause: error })),
        Effect.provideContext(context),
        Effect.withSpan('Prereviews.getPrereviewSummary', { attributes: { id } }),
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
