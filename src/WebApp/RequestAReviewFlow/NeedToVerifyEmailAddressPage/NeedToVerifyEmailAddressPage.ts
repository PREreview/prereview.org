import { html, plainText } from '../../../html.ts'
import { translate, type SupportedLocale } from '../../../locales/index.ts'
import type { PreprintId } from '../../../Preprints/index.ts'
import * as Routes from '../../../routes.ts'
import type { EmailAddress } from '../../../types/index.ts'
import { StreamlinePageResponse } from '../../Response/index.ts'

export const renderNeedToVerifyEmailAddressPage = ({
  preprintId,
  emailAddress,
  locale,
}: {
  preprintId: PreprintId
  emailAddress: EmailAddress.EmailAddress
  locale: SupportedLocale
}) => {
  const t = translate(locale, 'request-review-flow')

  return StreamlinePageResponse({
    title: plainText(t('verifyYourEmailAddress')()),
    main: html`
      <h1>${t('verifyYourEmailAddress')()}</h1>

      <p>${t('followLinkInEmail')({ emailAddress: html`<bdi>${emailAddress}</bdi>` })}</p>

      <p>${t('closePageOnceVerified')()}</p>
    `,
    canonical: Routes.RequestAReviewNeedToVerifyEmailAddress.href({ preprintId }),
  })
}
