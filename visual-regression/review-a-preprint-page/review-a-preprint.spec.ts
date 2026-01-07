import * as E from 'fp-ts/lib/Either.js'
import { invalidE } from '../../src/form.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { createPage } from '../../src/WebApp/review-a-preprint-page/review-a-preprint.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = createPage(E.right(undefined), DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with an error', async ({ showPage }) => {
  const response = createPage(E.left(invalidE('not-a-preprint')), DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
