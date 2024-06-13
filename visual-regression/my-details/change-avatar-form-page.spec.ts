import * as E from 'fp-ts/lib/Either.js'
import { missingE, tooBigE, wrongTypeE } from '../../src/form.js'
import { createPage } from '../../src/my-details-page/change-avatar-form-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = createPage({ form: { avatar: E.right(undefined) } })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when missing', async ({ showPage }) => {
  const response = createPage({ form: { avatar: E.left(missingE()) } })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when wrong type', async ({ showPage }) => {
  const response = createPage({ form: { avatar: E.left(wrongTypeE()) } })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when too big', async ({ showPage }) => {
  const response = createPage({ form: { avatar: E.left(tooBigE()) } })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
