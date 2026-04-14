import { html, plainText } from '../src/html.ts'
import { PageResponse } from '../src/WebApp/Response/index.ts'
import { expect, test } from './base.ts'

test('page layout looks right', async ({ showPage }) => {
  const response = PageResponse({
    main: html`<p>hello</p>`,
    title: plainText('Something'),
  })

  const content = await showPage(response)

  await expect(content.page()).toHaveScreenshot({ fullPage: true })
})

test('page layout looks right when there is a user', async ({ showPage }) => {
  const response = PageResponse({
    main: html`<p>hello</p>`,
    title: plainText('Something'),
  })

  const content = await showPage(response, { isLoggedIn: true })

  await expect(content.page()).toHaveScreenshot({ fullPage: true })
})

test("page layout looks right when my-details hasn't been seen", async ({ showPage }) => {
  const response = PageResponse({
    main: html`<p>hello</p>`,
    title: plainText('Something'),
  })

  const content = await showPage(response, { isLoggedIn: true, userOnboarding: { seenMyDetailsPage: false } })

  await expect(content.page()).toHaveScreenshot({ fullPage: true })
})
