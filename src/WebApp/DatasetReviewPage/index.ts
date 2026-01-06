import { Effect } from 'effect'
import * as DatasetReviews from '../../DatasetReviews/index.ts'
import * as Datasets from '../../Datasets/index.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import * as Personas from '../../Personas/index.ts'
import type { Uuid } from '../../types/index.ts'
import { createDatasetReviewPage } from './DatasetReviewPage.ts'

export const DatasetReviewPage = Effect.fn(
  function* ({ datasetReviewId }: { datasetReviewId: Uuid.Uuid }) {
    const datasetReview = yield* DatasetReviews.getPublishedReview(datasetReviewId)
    const { author, dataset } = yield* Effect.all(
      {
        author: Personas.getPersona(datasetReview.author),
        dataset: Datasets.getDataset(datasetReview.dataset),
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
