import { html, plainText } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import * as Routes from '../../../routes.ts'
import type { EmailAddress, Uuid } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

export const NeedToVerifyEmailAddressPage = ({
  commentId,
  emailAddress,
  locale,
}: {
  commentId: Uuid.Uuid
  emailAddress: EmailAddress.EmailAddress
  locale: SupportedLocale
}) =>
  StreamlinePageResponse({
    title: plainText(translate(locale, 'write-comment-flow', 'verifyEmailAddressTitle')()),
    main: html`
      <h1>${translate(locale, 'write-comment-flow', 'verifyEmailAddressTitle')()}</h1>

      <p>${translate(locale, 'write-comment-flow', 'howToVerifyEmailAddress')({ emailAddress })}</p>

      <p>${translate(locale, 'write-comment-flow', 'onceEmailAddressVerified')()}</p>
    `,
    canonical: Routes.WriteCommentNeedToVerifyEmailAddress.href({ commentId }),
  })
