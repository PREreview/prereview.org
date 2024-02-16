import * as E from 'fp-ts/Either'
import { missingE, tooBigE, wrongTypeE } from '../../src/form'
import { createPage } from '../../src/my-details-page/change-avatar-form-page'
import { expect, test } from '../base'

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
