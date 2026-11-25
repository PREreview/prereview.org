import { Context, Effect, pipe, Scope } from 'effect'
import { Queries } from '../../../../EventSourcing/index.ts'
import type { Uuid } from '../../../../types/index.ts'
import type { Clubs } from '../../../Clubs/index.ts'
import type { Datasets } from '../../../Datasets/index.ts'
import type { EventStore } from '../../../Events/index.ts'
import type { Prereviewers } from '../../../Prereviewers/index.ts'
import type { DatasetReviewHasNotBeenPublished, UnknownDatasetReview } from '../../Errors.ts'
import { GetPublishedReview } from '../GetPublishedReview.ts'
import { Enrich } from './Enrich.ts'
import { DatasetReviewIsUnavailable, type PublishedDatasetReview } from './Types.ts'

export type GetPublishedDatasetReview = (
  datasetReviewId: Uuid.Uuid,
) => Effect.Effect<
  PublishedDatasetReview,
  DatasetReviewHasNotBeenPublished | DatasetReviewIsUnavailable | UnknownDatasetReview
>

export const GetPublishedDatasetReview: Effect.Effect<
  GetPublishedDatasetReview,
  never,
  Clubs | Datasets | EventStore.EventStore | Prereviewers
> = Effect.gen(function* () {
  const context = yield* Effect.map(Effect.context<Clubs | Datasets | Prereviewers>(), Context.omit(Scope.Scope))

  const query = yield* Queries.makeOnDemandQuery(GetPublishedReview)

  return (datasetReviewId: Uuid.Uuid) =>
    pipe(
      query(datasetReviewId),
      Effect.andThen(Enrich),
      Effect.catchTag(
        ['UnableToQuery', 'UnableToGetPersona', 'DatasetIsNotFound', 'DatasetIsUnavailable', 'ClubNotFound'],
        error => new DatasetReviewIsUnavailable({ cause: error }),
      ),
      Effect.provideContext(context),
      Effect.withSpan('DatasetReviews.getPublishedDatasetReview', { attributes: { datasetReviewId } }),
    )
})
