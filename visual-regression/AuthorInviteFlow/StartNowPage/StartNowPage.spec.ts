import * as Datasets from '../../../src/Datasets/index.ts'
import { html } from '../../../src/html.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { PseudonymPersona, PublicPersona } from '../../../src/Personas/index.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { Name } from '../../../src/types/Name.ts'
import { OrcidId } from '../../../src/types/OrcidId.ts'
import { Pseudonym } from '../../../src/types/Pseudonym.ts'
import { PlainDate } from '../../../src/types/Temporal.ts'
import { Uuid } from '../../../src/types/Uuid.ts'
import * as _ from '../../../src/WebApp/AuthorInviteFlow/StartNowPage/StartNowPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.renderStartNowPage({ viewModel, locale: DefaultLocale, isLoggedIn: false })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when logged in', async ({ showPage }) => {
  const response = _.renderStartNowPage({ viewModel, locale: DefaultLocale, isLoggedIn: true })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const viewModel = {
  doi: Doi('10.5281/zenodo.10779310'),
  id: Uuid('4df1523a-3b38-4663-aaec-10d694af692d'),
  published: PlainDate.from({ year: 2026, month: 6, day: 2 }),
  invitationId: Uuid('d9de5f06-69ab-4ccf-a0ce-95b8f6af31c6'),
  author: new PublicPersona({
    orcidId: OrcidId('0000-0002-1825-0097'),
    name: Name('Josiah Carberry'),
  }),
  otherAuthors: [
    new PseudonymPersona({
      pseudonym: Pseudonym('Orange Panda'),
    }),
  ],
  anonymousAuthors: 2,
  dataset: {
    id: new Datasets.DryadDatasetId({ value: Doi('10.5061/dryad.wstqjq2n3') }),
    title: html`Metadata collected from 500 articles in the field of ecology and evolution`,
    language: 'en',
    url: new URL('https://datadryad.org/dataset/doi:10.5061/dryad.wstqjq2n3'),
  },
} satisfies _.ViewModel
