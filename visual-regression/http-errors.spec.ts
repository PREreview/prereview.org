import { html } from '../src/html'
import { havingProblemsPage, noPermissionPage, pageNotFound } from '../src/http-error'
import { page as templatePage } from '../src/page'
import { expect, test } from './base'

test('page-not-found page content looks right', async ({ showPage }) => {
  const content = await showPage(pageNotFound)

  await expect(content).toHaveScreenshot()
})

test('having-problems page content looks right', async ({ showPage }) => {
  const content = await showPage(havingProblemsPage)

  await expect(content).toHaveScreenshot()
})

test('no-permission page content looks right', async ({ page }) => {
  const pageHtml = templatePage({
    content: html` <main>${noPermissionPage.main}</main>`,
    title: noPermissionPage.title,
  })({})

  await page.setContent(pageHtml.toString())

  await expect(page.getByRole('main')).toHaveScreenshot()
})
