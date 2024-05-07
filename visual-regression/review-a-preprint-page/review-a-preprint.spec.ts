import * as E from 'fp-ts/Either'
import { invalidE } from '../../src/form'
import { createPage } from '../../src/review-a-preprint-page/review-a-preprint'
import { expect, test } from '../base'

test('content looks right', async ({ showPage }) => {
  const response = createPage(E.right(undefined))

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right with an error', async ({ showPage }) => {
  const response = createPage(E.left(invalidE('not-a-preprint')))

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})