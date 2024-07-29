import type { Doi } from 'doi-ts'
import type { Orcid } from 'orcid-id-ts'
import { html } from '../../src/html.js'
import type { PreprintTitle } from '../../src/preprint.js'
import type { EmailAddress } from '../../src/types/email-address.js'
import type { Pseudonym } from '../../src/types/pseudonym.js'
import type { NonEmptyString } from '../../src/types/string.js'
import type { User } from '../../src/user.js'
import type { CompletedForm } from '../../src/write-review/completed-form.js'
import { publishedPage } from '../../src/write-review/published-page/published-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ page, showHtml, templatePage }) => {
  const pageHtml = publishedPage({
    review: {
      doi: '10.5281/zenodo.10779310' as Doi,
      id: 10779310,
      form,
    },
    preprint,
    url: new URL('http://example.com/review'),
    user,
  })({ templatePage })

  await showHtml(pageHtml)

  await expect(page.locator('.contents')).toHaveScreenshot()
})

test('content looks right when the preprint is not on Sciety', async ({ page, showHtml, templatePage }) => {
  const pageHtml = publishedPage({
    review: {
      doi: '10.5281/zenodo.10779310' as Doi,
      id: 10779310,
      form,
    },
    preprint: {
      id: { type: 'philsci', value: 21986 },
      title: html`Philosophy of Open Science`,
      language: 'en',
    },
    url: new URL('http://example.com/review'),
    user,
  })({ templatePage })

  await showHtml(pageHtml)

  await expect(page.locator('.contents')).toHaveScreenshot()
})

test('content looks right when there are more authors', async ({ page, showHtml, templatePage }) => {
  const pageHtml = publishedPage({
    review: {
      doi: '10.5281/zenodo.10779310' as Doi,
      id: 10779310,
      form: {
        ...form,
        moreAuthors: 'yes',
        otherAuthors: [
          { name: 'Jean-Baptiste Botul' as NonEmptyString, emailAddress: 'jbbotul@example.com' as EmailAddress },
          { name: 'Arne Saknussemm' as NonEmptyString, emailAddress: 'asaknussemm@example.com' as EmailAddress },
          { name: 'Otto Lidenbrock' as NonEmptyString, emailAddress: 'olidenbrock@example.com' as EmailAddress },
        ],
      },
    },
    preprint,
    url: new URL('http://example.com/review'),
    user,
  })({ templatePage })

  await showHtml(pageHtml)

  await expect(page.locator('.contents')).toHaveScreenshot()
})

const preprint = {
  id: {
    type: 'biorxiv',
    value: '10.1101/2022.01.13.476201' as Doi<'1101'>,
  },
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

const user = {
  name: 'Josiah Carberry',
  orcid: '0000-0002-1825-0097' as Orcid,
  pseudonym: 'Orange Panda' as Pseudonym,
} satisfies User

const form = {
  reviewType: 'freeform',
  alreadyWritten: 'no',
  review: html`<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>`,
  persona: 'public',
  moreAuthors: 'no',
  competingInterests: 'yes',
  competingInterestsDetails:
    'In dictum consequat nibh, quis dapibus justo consequat quis. Duis nec mi orci. Phasellus tincidunt erat vitae ex sollicitudin molestie. Mauris faucibus erat sit amet felis viverra aliquam. Quisque eget mattis ante. Nam volutpat mattis ante, porttitor porta magna auctor ut. Praesent id ipsum quis nisl suscipit feugiat at non enim. Duis placerat est id dui pulvinar, ac viverra tortor feugiat. Morbi auctor lobortis vestibulum. Nullam bibendum consequat mi. Proin accumsan eros ut eros hendrerit, quis congue eros hendrerit. Suspendisse ac gravida diam.' as NonEmptyString,
  conduct: 'yes',
} satisfies CompletedForm
