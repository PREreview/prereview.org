import { Effect } from 'effect'
import { Locale } from '../../../Context.ts'
import { Datasets, DryadDatasetId } from '../../../Datasets/index.ts'
import * as Personas from '../../../Personas/index.ts'
import { Doi } from '../../../types/Doi.ts'
import { OrcidId } from '../../../types/OrcidId.ts'
import { PlainDate } from '../../../types/Temporal.ts'
import { Uuid } from '../../../types/Uuid.ts'
import { HavingProblemsPage } from '../../HavingProblemsPage/index.ts'
import type { Response } from '../../Response/index.ts'
import { renderStartNowPage, type ViewModel } from './StartNowPage.ts'

export const StartNowPage = (): Effect.Effect<Response, never, Locale | Datasets | Personas.Personas> =>
  Effect.gen(function* () {
    const locale = yield* Locale
    const datasets = yield* Datasets

    const datasetReviewForInvite = {
      author: {
        orcidId: OrcidId('0000-0002-1825-0097'),
        persona: 'public' as const,
      },
      otherAuthors: [],
      doi: Doi('10.1235/234234'),
      id: Uuid('6e1cc29e-be34-4bbc-b174-fdb4e5c57327'),
      published: PlainDate.from('2020-12-01'),
      anonymousAuthors: 1,
      dataset: new DryadDatasetId({ value: Doi('10.5061/dryad.wstqjq2n3') }),
    }

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
      author,
      otherAuthors,
      dataset: { id: dataset.id, title: dataset.title.text, language: dataset.title.language, url: dataset.url },
    } satisfies ViewModel

    return renderStartNowPage({ locale, viewModel })
  }).pipe(
    Effect.catchTags({
      DatasetIsNotFound: () => HavingProblemsPage,
      UnableToGetPersona: () => HavingProblemsPage,
      DatasetIsUnavailable: () => HavingProblemsPage,
    }),
  )
