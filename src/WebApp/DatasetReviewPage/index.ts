import { Effect, Option } from 'effect'
import { Clubs } from '../../Clubs/index.ts'
import { Locale } from '../../Context.ts'
import * as DatasetReviews from '../../DatasetReviews/index.ts'
import * as Datasets from '../../Datasets/index.ts'
import * as Prereviewers from '../../Prereviewers/index.ts'
import type { Uuid } from '../../types/index.ts'
import { HavingProblemsPage } from '../HavingProblemsPage/index.ts'
import { PageNotFound } from '../PageNotFound/index.ts'
import { createDatasetReviewPage } from './DatasetReviewPage.ts'

export const DatasetReviewPage = Effect.fn(
  function* ({ datasetReviewId }: { datasetReviewId: Uuid.Uuid }) {
    const clubs = yield* Clubs
    const locale = yield* Locale

    const datasetReview = yield* DatasetReviews.getPublishedReview(datasetReviewId)
    const { author, otherAuthors, dataset, club } = yield* Effect.all(
      {
        author: Prereviewers.getPersona(datasetReview.author),
        otherAuthors: Effect.forEach(datasetReview.otherAuthors ?? [], Prereviewers.getPersona, {
          concurrency: 'inherit',
        }),
        dataset: Datasets.getDataset(datasetReview.dataset),
        club: Effect.transposeOption(Option.map(datasetReview.clubId, clubs.getClubName)),
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
        club,
      },
      locale,
    })
  },
  Effect.catchTags({
    ClubNotFound: () => HavingProblemsPage,
    DatasetIsNotFound: () => HavingProblemsPage,
    DatasetIsUnavailable: () => HavingProblemsPage,
    DatasetReviewHasNotBeenPublished: () => PageNotFound,
    UnableToGetPersona: () => HavingProblemsPage,
    UnableToQuery: () => HavingProblemsPage,
    UnknownDatasetReview: () => PageNotFound,
  }),
)
