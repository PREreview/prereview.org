import { DefaultLocale } from '../../src/locales/index.js'
import { createNoPermissionPage } from '../../src/NoPermissionPage/NoPermissionPage.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(createNoPermissionPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
