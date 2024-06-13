import * as O from 'fp-ts/lib/Option.js'
import { createFormPage } from '../../src/my-details-page/change-open-for-requests-form-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createFormPage({ openForRequests: O.some({ value: true, visibility: 'public' }) })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when empty', async ({ showPage }) => {
  const response = createFormPage({ openForRequests: O.none })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when there is an error', async ({ showPage }) => {
  const response = createFormPage({ openForRequests: O.none, error: true })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
