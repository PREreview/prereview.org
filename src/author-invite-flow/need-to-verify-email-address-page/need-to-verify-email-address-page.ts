import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type { Uuid } from 'uuid-ts'
import type { UnverifiedContactEmailAddress } from '../../contact-email-address.js'
import { html, plainText } from '../../html.js'
import { translate, type SupportedLocale } from '../../locales/index.js'
import { StreamlinePageResponse } from '../../response.js'
import { authorInviteNeedToVerifyEmailAddressMatch } from '../../routes.js'

export function needToVerifyEmailAddressPage({
  contactEmailAddress,
  inviteId,
  locale,
}: {
  contactEmailAddress: UnverifiedContactEmailAddress
  inviteId: Uuid
  locale: SupportedLocale
}) {
  const t = translate(locale, 'author-invite-flow')
  return StreamlinePageResponse({
    title: pipe(t('verifyYourEmailAddress')(), plainText),
    main: html`
      <h1>${t('verifyYourEmailAddress')()}</h1>

      <p>
        ${t('pleaseOpenLinkInEmailWeSentYou')({
          contactEmailAddress: contactEmailAddress.value,
        })}
      </p>

      <p>${t('onceVerifiedYouCanClosePage')()}</p>
    `,
    canonical: format(authorInviteNeedToVerifyEmailAddressMatch.formatter, { id: inviteId }),
  })
}
