import { html, plainText } from '../src/html.ts'
import { NonEmptyString } from '../src/types/NonEmptyString.ts'
import { OrcidId } from '../src/types/OrcidId.ts'
import { Pseudonym } from '../src/types/Pseudonym.ts'
import type { User } from '../src/user.ts'
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
  name: NonEmptyString('Josiah Carberry'),
  orcid: OrcidId('0000-0002-1825-0097'),
  pseudonym: Pseudonym('Orange Panda'),
} satisfies User
