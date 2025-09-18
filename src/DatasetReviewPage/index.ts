import { Effect } from 'effect'
import * as DatasetReviews from '../DatasetReviews/index.js'
import * as Datasets from '../Datasets/index.js'
import { HavingProblemsPage } from '../HavingProblemsPage/index.js'
import { html } from '../html.js'
import { PageNotFound } from '../PageNotFound/index.js'
import * as Personas from '../Personas/index.js'
import { Doi, type Uuid } from '../types/index.js'
import { createDatasetReviewPage } from './DatasetReviewPage.js'

export const DatasetReviewPage = Effect.fn(
  function* ({ datasetReviewId }: { datasetReviewId: Uuid.Uuid }) {
    const datasetReview = yield* DatasetReviews.getPublishedReview(datasetReviewId)
    const author = yield* Personas.getPersona(datasetReview.author)

    return createDatasetReviewPage({
      datasetReview: {
        ...datasetReview,
        author,
        dataset: {
          id: new Datasets.DryadDatasetId({ value: Doi.Doi('10.5061/dryad.wstqjq2n3') }),
          title: html`Metadata collected from 500 articles in the field of ecology and evolution`,
          language: 'en',
          url: new URL('https://datadryad.org/dataset/doi:10.5061/dryad.wstqjq2n3'),
        },
      },
    })
  },
  Effect.catchTags({
    DatasetReviewHasNotBeenPublished: () => PageNotFound,
    UnableToGetPersona: () => HavingProblemsPage,
    UnableToQuery: () => HavingProblemsPage,
    UnknownDatasetReview: () => PageNotFound,
  }),
)
