import { Doi } from 'doi-ts'
import * as E from 'fp-ts/lib/Either.js'
import { invalidE, missingE } from '../../../src/form.js'
import { html } from '../../../src/html.js'
import { DefaultLocale } from '../../../src/locales/index.js'
import { type PreprintTitle, BiorxivPreprintId } from '../../../src/Preprints/index.js'
import { writeReviewForm } from '../../../src/write-review/write-review-page/write-review-form.js'
import { expect, test } from '../../base.js'

test('content looks right', async ({ showPage }) => {
  const response = writeReviewForm(preprint, { review: E.right(undefined) }, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is a review', async ({ showPage }) => {
  const response = writeReviewForm(preprint, { review: E.right(review) }, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the review is missing', async ({ showPage }) => {
  const response = writeReviewForm(preprint, { review: E.left(missingE()) }, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when the review is invalid', async ({ showPage }) => {
  const response = writeReviewForm(preprint, { review: E.left(invalidE('invalid review')) }, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

const preprint = {
  id: new BiorxivPreprintId({ value: Doi('10.1101/2022.01.13.476201') }),
  title: html`The role of LHCBM1 in non-photochemical quenching in <i>Chlamydomonas reinhardtii</i>`,
  language: 'en',
} satisfies PreprintTitle

const review = html`
  <h1>Lorem ipsum</h1>
  <p>Dolor sit amet, consectetur <strong>adipiscing</strong> <em>elit</em>.</p>
  <ul>
    <li>Aenean eget velit quis sapien gravida efficitur et vitae felis.</li>
    <li>
      <ol>
        <li>Etiam libero justo, vulputate sit amet turpis non, sollicitudin ornare velit.</li>
        <li>Mauris vel lorem ac erat pulvinar sollicitudin.</li>
        <li>
          Vestibulum auctor, augue et bibendum blandit, massa est ullamcorper libero, eget finibus justo sem eget elit.
        </li>
      </ol>
    </li>
  </ul>
  <h2>Quisque sed venenatis arcu</h2>
  <p>
    Aliquam non enim cursus, dictum quam vel, volutpat ex. Pellentesque posuere quam tellus, sit amet scelerisque sem
    interdum non. Pellentesque eget luctus lorem. Aliquam vel lobortis metus, fringilla elementum nisi. Phasellus eu
    felis ac nulla posuere posuere. Vivamus et elit bibendum, luctus nibh quis, aliquet lacus. Phasellus imperdiet nibh
    sit amet ante porttitor lacinia. Morbi tristique placerat massa at cursus. In condimentum purus quis ex dapibus
    scelerisque. Nulla augue mauris, sollicitudin a diam vel, semper porttitor sapien.
  </p>
`
