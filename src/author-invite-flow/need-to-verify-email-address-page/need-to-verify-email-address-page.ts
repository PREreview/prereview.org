import { format } from 'fp-ts-routing'
import type { Uuid } from 'uuid-ts'
import type { UnverifiedContactEmailAddress } from '../../contact-email-address.js'
import { html, plainText } from '../../html.js'
import type { SupportedLocale } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import { authorInviteNeedToVerifyEmailAddressMatch } from '../../routes.js'

export function needToVerifyEmailAddressPage({
  contactEmailAddress,
  inviteId,
}: {
  contactEmailAddress: UnverifiedContactEmailAddress
  inviteId: Uuid
  locale: SupportedLocale
}) {
  return StreamlinePageResponse({
    title: plainText`Verify your email address`,
    main: html`
      <h1>Verify your email address</h1>

      <p>
        Please open the email we sent to ${contactEmailAddress.value} and follow the link. You’ll then be able to add
        your name to the PREreview.
      </p>

      <p>Once your address is verified, you can close this page.</p>
    `,
    canonical: format(authorInviteNeedToVerifyEmailAddressMatch.formatter, { id: inviteId }),
  })
}
