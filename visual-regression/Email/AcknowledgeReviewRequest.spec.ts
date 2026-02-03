import * as _ from '../../src/ExternalInteractions/Email/AcknowledgeReviewRequest/CreateEmail.ts'
import { EmailAddress } from '../../src/types/EmailAddress.ts'
import { NonEmptyString } from '../../src/types/NonEmptyString.ts'
import { expect, test } from '../base.ts'

test('HTML looks right', async ({ page }) => {
  const email = _.CreateEmail({
    requester: {
      name: NonEmptyString('Josiah Carberry'),
      emailAddress: EmailAddress('jcarberry@example.com'),
    },
  })

  await page.setContent(email.html.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})

test('text looks right', async ({ page }) => {
  const email = _.CreateEmail({
    requester: {
      name: NonEmptyString('Josiah Carberry'),
      emailAddress: EmailAddress('jcarberry@example.com'),
    },
  })

  await page.setContent(`<pre>${email.text}</pre>`)

  await expect(page).toHaveScreenshot({ fullPage: true })
})
