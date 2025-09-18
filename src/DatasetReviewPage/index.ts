import { Effect } from 'effect'
import * as DatasetReviews from '../DatasetReviews/index.js'
import * as Datasets from '../Datasets/index.js'
import { HavingProblemsPage } from '../HavingProblemsPage/index.js'
import { PageNotFound } from '../PageNotFound/index.js'
import * as Personas from '../Personas/index.js'
import { Doi, type Uuid } from '../types/index.js'
import { createDatasetReviewPage } from './DatasetReviewPage.js'

export const DatasetReviewPage = Effect.fn(
  function* ({ datasetReviewId }: { datasetReviewId: Uuid.Uuid }) {
    const datasetReview = yield* DatasetReviews.getPublishedReview(datasetReviewId)
    const { author, dataset } = yield* Effect.all(
      {
        author: Personas.getPersona(datasetReview.author),
        dataset: Datasets.getDataset(new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') })),
      },
      { concurrency: 'inherit' },
    )

    return createDatasetReviewPage({
      datasetReview: {
        ...datasetReview,
        author,
        dataset: { id: dataset.id, title: dataset.title.text, language: dataset.title.language, url: dataset.url },
      },
    })
  },
  Effect.catchTags({
    DatasetIsNotFound: () => HavingProblemsPage,
    DatasetIsUnavailable: () => HavingProblemsPage,
    DatasetReviewHasNotBeenPublished: () => PageNotFound,
    UnableToGetPersona: () => HavingProblemsPage,
    UnableToQuery: () => HavingProblemsPage,
    UnknownDatasetReview: () => PageNotFound,
  }),
)
