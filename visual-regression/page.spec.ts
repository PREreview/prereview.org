import type { Orcid } from 'orcid-id-ts'
import { html, plainText } from '../src/html'
import { page as templatePage } from '../src/page'
import type { Pseudonym } from '../src/types/pseudonym'
import type { User } from '../src/user'
import { expect, test } from './base'

test('page layout looks right', async ({ page }) => {
  const pageHtml = templatePage({
    content: html`<p id="main">hello</p>`,
    title: plainText('Something'),
  })({})

  await page.setContent(pageHtml.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('page layout looks right when there is a user', async ({ page }) => {
  const pageHtml = templatePage({
    content: html`<p id="main">hello</p>`,
    title: plainText('Something'),
    user,
  })({})

  await page.setContent(pageHtml.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test("page layout looks right when my-details hasn't been seen", async ({ page }) => {
  const pageHtml = templatePage({
    content: html`<p id="main">hello</p>`,
    title: plainText('Something'),
    user,
    userOnboarding: { seenMyDetailsPage: false },
  })({})

  await page.setContent(pageHtml.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

const user = {
  name: 'Josiah Carberry',
  orcid: '0000-0002-1825-0097' as Orcid,
  pseudonym: 'Orange Panda' as Pseudonym,
} satisfies User
