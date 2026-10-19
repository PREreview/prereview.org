import { html } from '../../src/html.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { type PreprintTitle, BiorxivPreprintId, PhilsciPreprintId } from '../../src/Preprints/index.ts'
import { Doi } from '../../src/types/Doi.ts'
import { publishedPage } from '../../src/WebApp/write-review/published-page/published-page.ts'
import type { PublishedReview } from '../../src/WebApp/write-review/published-review.ts'
import { expect, test } from '../base.ts'

const locale = DefaultLocale

test('content looks right', async ({ showPage }) => {
  const response = publishedPage({
    review,
    preprint,
    url: new URL('http://example.com/review'),
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when using a pseudonym', async ({ showPage }) => {
  const response = publishedPage({
    review: { ...review, persona: 'pseudonym' },
    preprint,
    url: new URL('http://example.com/review'),
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the preprint is not on Sciety', async ({ showPage }) => {
  const response = publishedPage({
    review,
    preprint: {
      id: new PhilsciPreprintId({ value: 21986 }),
      title: html`Philosophy of Open Science`,
      language: 'en',
    },
    url: new URL('http://example.com/review'),
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there are more authors', async ({ showPage }) => {
  const response = publishedPage({
    review: { ...review, moreAuthors: 'yes', otherAuthors: 3 },
    preprint,
    url: new URL('http://example.com/review'),
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

const review = {
  doi: Doi('10.5281/zenodo.10779310'),
  id: 10779310,
  moreAuthors: 'no',
  otherAuthors: 0,
  persona: 'public',
} satisfies PublishedReview
