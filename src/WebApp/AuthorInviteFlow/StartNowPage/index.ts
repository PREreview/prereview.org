import { Effect } from 'effect'
import { Locale } from '../../../Context.ts'
import * as Datasets from '../../../Datasets/index.ts'
import { html } from '../../../html.ts'
import * as Personas from '../../../Personas/index.ts'
import { Doi } from '../../../types/Doi.ts'
import { NonEmptyString } from '../../../types/NonEmptyString.ts'
import { OrcidId } from '../../../types/OrcidId.ts'
import { PlainDate } from '../../../types/Temporal.ts'
import { Uuid } from '../../../types/Uuid.ts'
import type { Response } from '../../Response/index.ts'
import { renderStartNowPage, type ViewModel } from './StartNowPage.ts'

export const StartNowPage = (): Effect.Effect<Response, never, Locale> =>
  Effect.gen(function* () {
    const locale = yield* Locale
    const viewModel = {
      doi: Doi('10.1235/234234'),
      id: Uuid('6e1cc29e-be34-4bbc-b174-fdb4e5c57327'),
      published: PlainDate.from('2020-12-01'),
      author: new Personas.PublicPersona({
        name: NonEmptyString('Josiah Carberry'),
        orcidId: OrcidId('0000-0002-1825-0097'),
      }),
      otherAuthors: [],
      anonymousAuthors: 1,
      dataset: {
        id: new Datasets.DryadDatasetId({ value: Doi('10.7291/foo') }),
        language: 'en',
        title: html``,
        url: new URL('http://example.com'),
      },
    } satisfies ViewModel

    return renderStartNowPage({ locale, viewModel })
  })
