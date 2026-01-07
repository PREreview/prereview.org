import { DefaultLocale } from '../../src/locales/index.ts'
import { createNoPermissionPage } from '../../src/WebApp/NoPermissionPage/NoPermissionPage.ts'
import { expect, test } from '../base.ts'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(createNoPermissionPage(DefaultLocale))

  await expect(content).toHaveScreenshot()
})
