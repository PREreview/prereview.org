import { createNoPermissionPage } from '../../src/NoPermissionPage/NoPermissionPage.js'
import { expect, test } from '../base.js'

test('content looks right', async ({ showPage }) => {
  const content = await showPage(createNoPermissionPage())

  await expect(content).toHaveScreenshot()
})
