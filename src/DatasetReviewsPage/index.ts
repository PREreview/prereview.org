import { Effect } from 'effect'
import * as DatasetReviews from '../DatasetReviews/index.js'
import * as Datasets from '../Datasets/index.js'
import { HavingProblemsPage } from '../HavingProblemsPage/index.js'
import * as Personas from '../Personas/index.js'
import { Doi } from '../types/index.js'
import { createDatasetReviewsPage } from './DatasetReviewsPage.js'

export const DatasetReviewsPage = Effect.fn(
  function* () {
    const datasetId = new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })

    const datasetReviewIds = yield* DatasetReviews.findPublishedReviewsForADataset(datasetId)

    const datasetReviews = yield* Effect.forEach(
      datasetReviewIds,
      Effect.fn(function* (datasetReviewId) {
        const datasetReview = yield* DatasetReviews.getPublishedReview(datasetReviewId)
        const author = yield* Personas.getPersona(datasetReview.author)

        return { ...datasetReview, author }
      }),
    )

    return createDatasetReviewsPage({ datasetReviews })
  },
  Effect.catchTags({
    DatasetReviewHasNotBeenPublished: () => HavingProblemsPage,
    UnableToGetPersona: () => HavingProblemsPage,
    UnableToQuery: () => HavingProblemsPage,
    UnknownDatasetReview: () => HavingProblemsPage,
  }),
)
