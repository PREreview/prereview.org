import { Effect } from 'effect'
import * as DatasetReviews from '../DatasetReviews/index.js'
import { HavingProblemsPage } from '../HavingProblemsPage/index.js'
import { PageNotFound } from '../PageNotFound/index.js'
import * as Personas from '../Personas/index.js'
import type { Uuid } from '../types/index.js'
import { createDatasetReviewPage } from './DatasetReviewPage.js'

export const DatasetReviewPage = Effect.fn(
  function* ({ datasetReviewId }: { datasetReviewId: Uuid.Uuid }) {
    const datasetReview = yield* DatasetReviews.getPublishedReview(datasetReviewId)
    const author = yield* Personas.getPersona(datasetReview.author)

    return createDatasetReviewPage({ datasetReview: { ...datasetReview, author } })
  },
  Effect.catchTags({
    DatasetReviewHasNotBeenPublished: () => PageNotFound,
    UnableToGetPersona: () => HavingProblemsPage,
    UnableToQuery: () => HavingProblemsPage,
    UnknownDatasetReview: () => PageNotFound,
  }),
)
