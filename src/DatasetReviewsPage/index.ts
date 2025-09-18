import { Effect } from 'effect'
import * as DatasetReviews from '../DatasetReviews/index.js'
import * as Datasets from '../Datasets/index.js'
import { HavingProblemsPage } from '../HavingProblemsPage/index.js'
import { PageNotFound } from '../PageNotFound/index.js'
import * as Personas from '../Personas/index.js'
import { createDatasetReviewsPage } from './DatasetReviewsPage.js'

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
