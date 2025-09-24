import * as E from 'fp-ts/lib/Either.js'
import { missingE, tooBigE, wrongTypeE } from '../../src/form.ts'
import { DefaultLocale } from '../../src/locales/index.ts'
import { createPage } from '../../src/my-details-page/change-avatar-form-page.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = createPage({ form: { avatar: E.right(undefined) }, locale: DefaultLocale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when missing', async ({ showPage }) => {
  const response = createPage({ form: { avatar: E.left(missingE()) }, locale: DefaultLocale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when wrong type', async ({ showPage }) => {
  const response = createPage({ form: { avatar: E.left(wrongTypeE()) }, locale: DefaultLocale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when too big', async ({ showPage }) => {
  const response = createPage({ form: { avatar: E.left(tooBigE()) }, locale: DefaultLocale })

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
