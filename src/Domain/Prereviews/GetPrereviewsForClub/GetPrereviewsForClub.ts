import { Array, Context, Effect, flow, Option, pipe, Scope, Struct } from 'effect'
import type * as EventDispatcher from '../../../EventDispatcher.ts'
import * as Queries from '../../../Queries.ts'
import type { Uuid } from '../../../types/index.ts'
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
import { ClubPrereviewId, ListClubPrereviewIds } from './ListClubPrereviewIds.ts'
import { PrereviewsAreUnavailable } from './Types.ts'

export type GetPrereviewsForClub = (
  clubId: Uuid.Uuid,
) => Effect.Effect<ReadonlyArray<RecentPreprintPrereview | RecentDatasetPrereview>, PrereviewsAreUnavailable>

export const GetPrereviewsForClub: Effect.Effect<
  GetPrereviewsForClub,
  never,
  DatasetReviewQueries | EventDispatcher.EventDispatcher | PreprintReviews | WasPrereviewRemoved
> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<DatasetReviewQueries | PreprintReviews>(), Context.omit(Scope.Scope))
  const wasPrereviewRemoved = yield* WasPrereviewRemoved
  const listClubPrereviewIds = yield* Queries.makeStatefulQuery(ListClubPrereviewIds(wasPrereviewRemoved))

  return (clubId: Uuid.Uuid) =>
    pipe(
      listClubPrereviewIds(clubId),
      Effect.andThen(
        Effect.forEach(
          ClubPrereviewId.$match({
            PreprintReview: ({ id }) => getRecentPreprintPrereview(id),
            DatasetReview: ({ id }) => getRecentDatasetPrereview(id),
          }),
          { concurrency: 'unbounded' },
        ),
      ),
      Effect.catchTag(
        [
          'DatasetReviewHasNotBeenPublished',
          'DatasetReviewIsUnavailable',
          'PrereviewIsNotFound',
          'PrereviewIsUnavailable',
          'PrereviewWasRemoved',
          'UnknownDatasetReview',
        ],
        error => new PrereviewsAreUnavailable({ cause: error }),
      ),
      Effect.provideContext(context),
      Effect.withSpan('Prereviews.getPrereviewsForClub', { attributes: { clubId } }),
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
