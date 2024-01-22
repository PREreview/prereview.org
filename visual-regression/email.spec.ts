import type { Uuid } from 'uuid-ts'
import { createAuthorInviteEmail } from '../src/email'
import type { EmailAddress } from '../src/types/email-address'
import type { NonEmptyString } from '../src/types/string'
import { expect, test } from './base'

test('author-invite HTML looks right', async ({ page }) => {
  const email = createAuthorInviteEmail(
    {
      name: 'Josiah Carberry' as NonEmptyString,
      emailAddress: 'jcarberry@example.com' as EmailAddress,
    },
    'cda07004-01ec-4d48-8ff0-87bb32c6e81d' as Uuid,
  )({ publicUrl: new URL('http://example.com') })

  await page.setContent(email.html.toString())

  await expect(page).toHaveScreenshot({ fullPage: true })
})
