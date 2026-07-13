import { type Array, Either } from 'effect'
import type { ClubId } from '../../../src/Clubs/index.ts'
import { html } from '../../../src/html.ts'
import { DefaultLocale } from '../../../src/locales/index.ts'
import { BiorxivPreprintId, type PreprintTitle } from '../../../src/Preprints/index.ts'
import { Doi } from '../../../src/types/Doi.ts'
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
      '4dbef4c4-3793-4a32-9837-3fa39a69188a',
      '8ee46f04-af8f-49f9-bc1c-1d3e2602672d',
      '4bfded37-5773-4cc0-a073-2ce05cdb939c',
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
    form: new AddToAClubForm.CompletedForm({ addToClub: clubs[0] }),
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

const clubs = ['4dbef4c4-3793-4a32-9837-3fa39a69188a'] satisfies Array.NonEmptyReadonlyArray<ClubId>

const locale = DefaultLocale

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle
