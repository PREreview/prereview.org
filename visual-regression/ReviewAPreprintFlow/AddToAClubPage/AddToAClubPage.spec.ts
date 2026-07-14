import { type Array, Either } from 'effect'
import type { ClubName } from '../../../src/Clubs/index.ts'
import { html } from '../../../src/html.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { BiorxivPreprintId, type PreprintTitle } from '../../../src/Preprints/index.ts'
import { Doi } from '../../../src/types/Doi.ts'
import { Name } from '../../../src/types/Name.ts'
import { Slug } from '../../../src/types/Slug.ts'
import { Uuid } from '../../../src/types/Uuid.ts'
import * as AddToAClubForm from '../../../src/WebApp/ReviewAPreprintFlow/AddToAClubPage/AddToAClubForm.ts'
import * as _ from '../../../src/WebApp/ReviewAPreprintFlow/AddToAClubPage/AddToAClubPage.ts'
import { expect, test } from '../../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = _.renderAddToAClubPage({
    clubs,
    form: new AddToAClubForm.EmptyForm(),
    locale,
    preprint,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with multiple clubs', async ({ showPage }) => {
  const response = _.renderAddToAClubPage({
    clubs: [
      {
        id: Uuid('4dbef4c4-3793-4a32-9837-3fa39a69188a'),
        language: 'en',
        name: Name('Future of Research Communication and e-Scholarship (FORCE11)'),
        slug: Slug('force11'),
      },
      {
        id: Uuid('8ee46f04-af8f-49f9-bc1c-1d3e2602672d'),
        language: 'en',
        name: Name('ASAPbio Microbiology Crowd'),
        slug: Slug('asap-microbiology'),
      },
      {
        id: Uuid('4bfded37-5773-4cc0-a073-2ce05cdb939c'),
        language: 'en',
        name: Name('Proteostasis and Cancer Team INSERM U1242'),
        slug: Slug('prosac'),
      },
    ],
    form: new AddToAClubForm.EmptyForm(),
    locale,
    preprint,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is a choice', async ({ showPage }) => {
  const response = _.renderAddToAClubPage({
    clubs,
    form: new AddToAClubForm.CompletedForm({ addToClub: clubs[0].id }),
    locale,
    preprint,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the choice is missing', async ({ showPage }) => {
  const response = _.renderAddToAClubPage({
    clubs,
    form: new AddToAClubForm.InvalidForm({
      addToClub: Either.left(new AddToAClubForm.Missing()),
    }),
    locale,
    preprint,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const clubs = [
  {
    id: Uuid('4dbef4c4-3793-4a32-9837-3fa39a69188a'),
    language: 'en',
    name: Name('Future of Research Communication and e-Scholarship (FORCE11)'),
    slug: Slug('force11'),
  },
] satisfies Array.NonEmptyReadonlyArray<ClubName>

const locale = DefaultLocale

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle
