import { Orcid } from 'orcid-id-ts'
import { html, plainText } from '../src/html.js'
import { PageResponse } from '../src/response.js'
import { Pseudonym } from '../src/types/Pseudonym.js'
import type { User } from '../src/user.js'
import { expect, test } from './base.js'

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

  const content = await showPage(response, { user })

  await expect(content.page()).toHaveScreenshot({ fullPage: true })
})

test("page layout looks right when my-details hasn't been seen", async ({ showPage }) => {
  const response = PageResponse({
    main: html`<p>hello</p>`,
    title: plainText('Something'),
  })

  const content = await showPage(response, { user, userOnboarding: { seenMyDetailsPage: false } })

  await expect(content.page()).toHaveScreenshot({ fullPage: true })
})

const user = {
  name: 'Josiah Carberry',
  orcid: Orcid('0000-0002-1825-0097'),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies User
