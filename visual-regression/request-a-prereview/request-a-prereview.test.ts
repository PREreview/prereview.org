import { DefaultLocale } from '../../src/locales/index.ts'
import * as Form from '../../src/request-a-prereview-page/form.ts'
import { requestAPrereviewPage } from '../../src/request-a-prereview-page/request-a-prereview-page.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const response = requestAPrereviewPage(Form.EmptyForm, DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when invalid', async ({ showPage }) => {
  const response = requestAPrereviewPage(Form.InvalidForm('not-a-preprint'), DefaultLocale)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
