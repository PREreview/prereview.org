import * as Form from '../../src/request-a-prereview-page/form.js'
import { requestAPrereviewPage } from '../../src/request-a-prereview-page/request-a-prereview-page.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const response = requestAPrereviewPage(Form.EmptyForm)

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})

test('content looks right when invalid', async ({ showPage }) => {
  const response = requestAPrereviewPage(Form.InvalidForm('not-a-preprint'))

  const content = await showPage(response)

  await expect(content).toHaveScreenshot()
})
