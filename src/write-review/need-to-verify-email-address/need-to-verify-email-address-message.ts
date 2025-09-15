import { pipe } from 'effect'
import { format } from 'fp-ts-routing'
import type { UnverifiedContactEmailAddress } from '../../contact-email-address.js'
import { html, plainText } from '../../html.js'
import { type SupportedLocale, translate } from '../../locales/index.js'
import type { PreprintTitle } from '../../Preprints/index.js'
import { StreamlinePageResponse } from '../../response.js'
import { writeReviewEnterEmailAddressMatch, writeReviewNeedToVerifyEmailAddressMatch } from '../../routes.js'
import { prereviewOfSuffix } from '../shared-elements.js'

export const needToVerifyEmailAddressMessage = ({
  contactEmailAddress,
  locale,
  preprint,
}: {
  contactEmailAddress: UnverifiedContactEmailAddress
  locale: SupportedLocale
  preprint: PreprintTitle
}) => {
  const t = translate(locale, 'write-review')

  return StreamlinePageResponse({
    title: pipe(t('verifyEmailAddress')(), prereviewOfSuffix(locale, preprint.title), plainText),
    nav: html`
      <a href="${format(writeReviewEnterEmailAddressMatch.formatter, { id: preprint.id })}" class="back"
        ><span>${translate(locale, 'forms', 'backLink')()}</span></a
      >
    `,
    main: html`
      <h1>${t('verifyEmailAddress')()}</h1>

      <p>${t('howToVerifyEmailAddress')({ emailAddress: contactEmailAddress.value })}</p>

      <p>${t('onceEmailAddressVerified')()}</p>

      <form
        method="post"
        action="${format(writeReviewNeedToVerifyEmailAddressMatch.formatter, { id: preprint.id })}"
        novalidate
      >
        <button class="secondary">${t('resendEmailButton')()}</button>
      </form>
    `,
  })
}
