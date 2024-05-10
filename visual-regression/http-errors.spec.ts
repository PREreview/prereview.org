import { havingProblemsPage, noPermissionPage, pageNotFound } from '../src/http-error'
import { expect, test } from './base'

test('page-not-found page content looks right', async ({ showPage }) => {
  const content = await showPage(pageNotFound)

  await expect(content).toHaveScreenshot()
})

test('having-problems page content looks right', async ({ showPage }) => {
  const content = await showPage(havingProblemsPage)

  await expect(content).toHaveScreenshot()
})

test('no-permission page content looks right', async ({ showPage }) => {
  const content = await showPage(noPermissionPage)

  await expect(content).toHaveScreenshot()
})
