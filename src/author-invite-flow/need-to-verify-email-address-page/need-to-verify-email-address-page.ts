import { format } from 'fp-ts-routing'
import type { Uuid } from 'uuid-ts'
import type { UnverifiedContactEmailAddress } from '../../contact-email-address'
import { html, plainText } from '../../html'
import { StreamlinePageResponse } from '../../response'
import { authorInviteNeedToVerifyEmailAddressMatch } from '../../routes'

export function needToVerifyEmailAddressPage({
  contactEmailAddress,
  inviteId,
}: {
  contactEmailAddress: UnverifiedContactEmailAddress
  inviteId: Uuid
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
