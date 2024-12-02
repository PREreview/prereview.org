import { html, plainText } from '../../html.js'
import { StreamlinePageResponse } from '../../response.js'
import * as Routes from '../../routes.js'
import type { EmailAddress, Uuid } from '../../types/index.js'

export const NeedToVerifyEmailAddressPage = ({
  commentId,
  emailAddress,
}: {
  commentId: Uuid.Uuid
  emailAddress: EmailAddress.EmailAddress
}) =>
  StreamlinePageResponse({
    title: plainText`Verify your email address`,
    main: html`
      <h1>Verify your email address</h1>

      <p>
        Please open the email we sent to ${emailAddress} and follow the link. You’ll then be able to publish your
        comment.
      </p>

      <p>Once your address is verified, you can close this page.</p>
    `,
    canonical: Routes.WriteCommentNeedToVerifyEmailAddress.href({ commentId }),
  })
