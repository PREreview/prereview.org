import { html, plainText } from '../../../html.ts'
import type { SupportedLocale } from '../../../locales/index.ts'
import type { PreprintId } from '../../../Preprints/index.ts'
import * as Routes from '../../../routes.ts'
import type { EmailAddress } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

export const renderNeedToVerifyEmailAddressPage = ({
  preprintId,
  emailAddress,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  locale,
}: {
  preprintId: PreprintId
  emailAddress: EmailAddress.EmailAddress
  locale: SupportedLocale
}) =>
  StreamlinePageResponse({
    title: plainText('Verify your email address'),
    main: html`
      <h1><span lang="en" dir="ltr">Verify your email address</span></h1>

      <p>
        <span lang="en" dir="ltr"
          >Please open the email we sent to <bdi>${emailAddress}</bdi> and follow the link. You’ll then be able to
          publish your request.</span
        >
      </p>

      <p><span lang="en" dir="ltr">Once your address is verified, you can close this page.</span></p>
    `,
    canonical: Routes.RequestAReviewNeedToVerifyEmailAddress.href({ preprintId }),
  })
