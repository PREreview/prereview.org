import { Effect } from 'effect'
import * as DatasetReviews from '../../DatasetReviews/index.ts'
import * as Datasets from '../../Datasets/index.ts'
import * as Personas from '../../Personas/index.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { PageNotFound } from '../PageNotFound/index.ts'
import { createDatasetReviewsPage } from './DatasetReviewsPage.ts'

export const DatasetReviewsPage = Effect.fn(
  function* ({ datasetId }: { datasetId: Datasets.DatasetId }) {
    const { dataset, datasetReviews } = yield* Effect.all(
      {
        dataset: Datasets.getDataset(datasetId),
        datasetReviews: Effect.andThen(
          DatasetReviews.findPublishedReviewsForADataset(datasetId),
          Effect.forEach(
            Effect.fn(function* (datasetReviewId) {
              const datasetReview = yield* DatasetReviews.getPublishedReview(datasetReviewId)
              const author = yield* Personas.getPersona(datasetReview.author)

              return { ...datasetReview, author }
            }),
            { concurrency: 'inherit' },
          ),
        ),
      },
      { concurrency: 'inherit' },
    )

    return createDatasetReviewsPage({ dataset, datasetReviews })
  },
  Effect.catchTags({
    DatasetIsNotFound: () => PageNotFound,
    DatasetIsUnavailable: () => HavingProblemsPage,
    DatasetReviewHasNotBeenPublished: () => HavingProblemsPage,
    UnableToGetPersona: () => HavingProblemsPage,
    UnableToQuery: () => HavingProblemsPage,
    UnknownDatasetReview: () => HavingProblemsPage,
  }),
)
