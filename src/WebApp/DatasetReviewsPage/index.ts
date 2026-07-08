import { Effect } from 'effect'
import { Locale } from '../../Context.ts'
import * as DatasetReviews from '../../DatasetReviews/index.ts'
import * as Datasets from '../../Datasets/index.ts'
import * as Prereviewers from '../../Prereviewers/index.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { PageNotFound } from '../PageNotFound/index.ts'
import { createDatasetReviewsPage } from './DatasetReviewsPage.ts'

export const DatasetReviewsPage = Effect.fn(
  function* ({ datasetId }: { datasetId: Datasets.DatasetId }) {
    const locale = yield* Locale

    const { dataset, datasetReviews } = yield* Effect.all(
      {
        dataset: Datasets.getDataset(datasetId),
        datasetReviews: Effect.andThen(
          DatasetReviews.findPublishedReviewsForADataset(datasetId),
          Effect.forEach(
            Effect.fn(function* (datasetReviewId) {
              const datasetReview = yield* DatasetReviews.getPublishedReview(datasetReviewId)

              const { author, otherAuthors } = yield* Effect.all(
                {
                  author: Prereviewers.getPersona(datasetReview.author),
                  otherAuthors: Effect.forEach(datasetReview.otherAuthors ?? [], Prereviewers.getPersona, {
                    concurrency: 'inherit',
                  }),
                },
                { concurrency: 'inherit' },
              )

              return { ...datasetReview, otherAuthors, anonymousAuthors: datasetReview.anonymousAuthors ?? 0, author }
            }),
            { concurrency: 'inherit' },
          ),
        ),
      },
      { concurrency: 'inherit' },
    )

    return createDatasetReviewsPage({ dataset, datasetReviews, locale })
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
