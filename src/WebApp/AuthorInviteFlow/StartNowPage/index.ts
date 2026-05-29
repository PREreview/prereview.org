import { Effect } from 'effect'
import { Locale } from '../../../Context.ts'
import { DatasetReviewQueries } from '../../../DatasetReviews/index.ts'
import { Datasets } from '../../../Datasets/index.ts'
import * as Personas from '../../../Personas/index.ts'
import type { Uuid } from '../../../types/Uuid.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import { PageNotFound } from '../../PageNotFound/index.ts'
import type { Response } from '../../Response/index.ts'
import { renderStartNowPage, type ViewModel } from './StartNowPage.ts'

export const StartNowPage = ({
  invitationId,
}: {
  invitationId: Uuid
}): Effect.Effect<Response, never, Locale | Datasets | DatasetReviewQueries | Personas.Personas> =>
  Effect.gen(function* () {
    const locale = yield* Locale
    const datasets = yield* Datasets
    const datasetReviewQueries = yield* DatasetReviewQueries

    const datasetReviewForInvite = yield* datasetReviewQueries.getDatasetReviewForInvite(invitationId)

    const { author, otherAuthors, dataset } = yield* Effect.all(
      {
        author: Personas.getPersona(datasetReviewForInvite.author),
        otherAuthors: Effect.forEach(datasetReviewForInvite.otherAuthors, Personas.getPersona, {
          concurrency: 'inherit',
        }),
        dataset: datasets.getDataset(datasetReviewForInvite.dataset),
      },
      { concurrency: 'inherit' },
    )

    const viewModel = {
      ...datasetReviewForInvite,
      invitationId,
      author,
      otherAuthors,
      dataset: { id: dataset.id, title: dataset.title.text, language: dataset.title.language, url: dataset.url },
    } satisfies ViewModel

    return renderStartNowPage({ locale, viewModel })
  }).pipe(
    Effect.catchTags({
      DatasetReviewInvitationNotInList: () => PageNotFound,
      DatasetReviewHasNotBeenPublished: () => PageNotFound,
      DatasetIsNotFound: () => HavingProblemsPage,
      UnableToGetPersona: () => HavingProblemsPage,
      DatasetIsUnavailable: () => HavingProblemsPage,
      UnableToQuery: () => HavingProblemsPage,
    }),
  )
