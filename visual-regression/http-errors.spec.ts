import { havingProblemsPage, noPermissionPage } from '../src/http-error.js'
import { expect, test } from './base.js'

test('having-problems page content looks right', async ({ showPage }) => {
  const content = await showPage(havingProblemsPage)

  await expect(content).toHaveScreenshot()
})

test('no-permission page content looks right', async ({ showPage }) => {
  const content = await showPage(noPermissionPage)

  await expect(content).toHaveScreenshot()
})
