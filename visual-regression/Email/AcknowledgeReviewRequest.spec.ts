import { Effect } from 'effect'
import * as _ from '../../src/ExternalInteractions/Email/AcknowledgeReviewRequest/CreateEmail.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { Name } from '../../src/types/Name.ts'
import { expect, test } from '../base.ts'

test('HTML looks right', async ({ page }) => {
  const email = await Effect.runPromise(
    _.CreateEmail({
      requester: {
        name: Name('Josiah Carberry'),
        emailAddress: EmailAddress('jcarberry@example.com'),
      },
    }),
  )

  await page.setContent(email.html.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('text looks right', { tag: '@text' }, async () => {
  const email = await Effect.runPromise(
    _.CreateEmail({
      requester: {
        name: Name('Josiah Carberry'),
        emailAddress: EmailAddress('jcarberry@example.com'),
      },
    }),
  )

  expect(`${email.text}\n`).toMatchSnapshot()
})
