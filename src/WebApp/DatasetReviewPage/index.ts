import { Effect, Option } from 'effect'
import { getClubName, getClubSlug } from '../../Clubs/index.ts'
import { Locale } from '../../Context.ts'
import * as DatasetReviews from '../../DatasetReviews/index.ts'
import * as Datasets from '../../Datasets/index.ts'
import * as Prereviewers from '../../Prereviewers/index.ts'
import { Uuid } from '../../types/index.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { PageNotFound } from '../PageNotFound/index.ts'
import { createDatasetReviewPage } from './DatasetReviewPage.ts'

export const DatasetReviewPage = Effect.fn(
  function* ({ datasetReviewId }: { datasetReviewId: Uuid.Uuid }) {
    const locale = yield* Locale

    const datasetReview = yield* DatasetReviews.getPublishedReview(datasetReviewId)
    const { author, otherAuthors, dataset } = yield* Effect.all(
      {
        author: Prereviewers.getPersona(datasetReview.author),
        otherAuthors: Effect.forEach(datasetReview.otherAuthors ?? [], Prereviewers.getPersona, {
          concurrency: 'inherit',
        }),
        dataset: Datasets.getDataset(datasetReview.dataset),
      },
      { concurrency: 'inherit' },
    )

    return createDatasetReviewPage({
      datasetReview: {
        ...datasetReview,
        author,
        otherAuthors,
        anonymousAuthors: datasetReview.anonymousAuthors ?? 0,
        dataset: { id: dataset.id, title: dataset.title.text, language: dataset.title.language, url: dataset.url },
        club: Option.map(datasetReview.clubId, id => ({
          id: Uuid.Uuid(id),
          name: getClubName(id).text,
          language: getClubName(id).language,
          slug: getClubSlug(id),
        })),
      },
      locale,
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
