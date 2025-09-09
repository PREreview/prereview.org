import { Doi } from 'doi-ts'
import { html } from '../../src/html.js'
import { DefaultLocale } from '../../src/locales/index.js'
import type { PreprintTitle } from '../../src/preprint.js'
import { EmailAddress } from '../../src/types/EmailAddress.js'
import { NonEmptyString } from '../../src/types/NonEmptyString.js'
import { BiorxivPreprintId, PhilsciPreprintId } from '../../src/types/preprint-id.js'
import type { CompletedForm } from '../../src/write-review/completed-form.js'
import { publishedPage } from '../../src/write-review/published-page/published-page.js'
import { expect, test } from '../base.js'

const locale = DefaultLocale

test('content looks right', async ({ showPage }) => {
  const response = publishedPage({
    review: {
      doi: Doi('10.5281/zenodo.10779310'),
      id: 10779310,
      form,
    },
    preprint,
    url: new URL('http://example.com/review'),
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when using a pseudonym', async ({ showPage }) => {
  const response = publishedPage({
    review: {
      doi: Doi('10.5281/zenodo.10779310'),
      id: 10779310,
      form: { ...form, persona: 'pseudonym' },
    },
    preprint,
    url: new URL('http://example.com/review'),
    locale,
  })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the preprint is not on Sciety', async ({ showPage }) => {
  const response = publishedPage({
    review: {
      doi: Doi('10.5281/zenodo.10779310'),
      id: 10779310,
      form,
    },
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
    review: {
      doi: Doi('10.5281/zenodo.10779310'),
      id: 10779310,
      form: {
        ...form,
        moreAuthors: 'yes',
        otherAuthors: [
          { name: NonEmptyString('Jean-Baptiste Botul'), emailAddress: EmailAddress('jbbotul@example.com') },
          { name: NonEmptyString('Arne Saknussemm'), emailAddress: EmailAddress('asaknussemm@example.com') },
          { name: NonEmptyString('Otto Lidenbrock'), emailAddress: EmailAddress('olidenbrock@example.com') },
        ],
      },
    },
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

const form = {
  reviewType: 'freeform',
  alreadyWritten: 'no',
  review: html`<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>`,
  persona: 'public',
  moreAuthors: 'no',
  generativeAiIdeas: 'no',
  competingInterests: 'yes',
  competingInterestsDetails: NonEmptyString(
    'In dictum consequat nibh, quis dapibus justo consequat quis. Duis nec mi orci. Phasellus tincidunt erat vitae ex sollicitudin molestie. Mauris faucibus erat sit amet felis viverra aliquam. Quisque eget mattis ante. Nam volutpat mattis ante, porttitor porta magna auctor ut. Praesent id ipsum quis nisl suscipit feugiat at non enim. Duis placerat est id dui pulvinar, ac viverra tortor feugiat. Morbi auctor lobortis vestibulum. Nullam bibendum consequat mi. Proin accumsan eros ut eros hendrerit, quis congue eros hendrerit. Suspendisse ac gravida diam.',
  ),
  conduct: 'yes',
} satisfies CompletedForm
