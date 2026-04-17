import { Effect } from 'effect'
import rtlDetect from 'rtl-detect'
import type { UnverifiedContactEmailAddress } from '../../../contact-email-address.ts'
import { Locale } from '../../../Context.ts'
import type { Nodemailer } from '../../../ExternalApis/index.ts'
import { html, mjmlToHtml } from '../../../html.ts'
import { translate } from '../../../locales/index.ts'
import type * as Preprints from '../../../Preprints/index.ts'
import { forRoute, type PublicUrl } from '../../../public-url.ts'
import * as Routes from '../../../routes.ts'
import { EmailAddress, type NonEmptyString } from '../../../types/index.ts'

export const CreateEmail: (details: {
  name: NonEmptyString.NonEmptyString
  emailAddress: UnverifiedContactEmailAddress
  preprint: Preprints.IndeterminatePreprintId
}) => Effect.Effect<Nodemailer.Email, never, Locale | PublicUrl> = Effect.fnUntraced(function* ({
  name,
  emailAddress,
  preprint,
}) {
  const locale = yield* Locale

  const t = translate(locale, 'email')

  const verificationUrl = yield* forRoute(Routes.writeReviewVerifyEmailAddressMatch.formatter, {
    id: preprint,
    verify: emailAddress.verificationToken,
  })

  return {
    from: { address: EmailAddress.EmailAddress('help@prereview.org'), name: 'PREreview' },
    to: { address: emailAddress.value, name },
    subject: t('verifyEmailAddressTitle')(),
    html: mjmlToHtml(html`
      <mjml lang="${locale}" dir="${rtlDetect.getLangDir(locale)}">
        <mj-head>
          <mj-attributes>
            <mj-button border="transparent solid"></mj-button>
          </mj-attributes>
        </mj-head>
        <mj-body>
          <mj-section>
            <mj-column>
              <mj-text>${t('hiName')({ name })}</mj-text>
              <mj-text>${t('verifyEmailAddressWithButton')()}</mj-text>
              <mj-button href="${verificationUrl.href}">${t('verifyEmailAddressButton')()}</mj-button>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `),
    text: `${t('hiName')({ name })}\n\n${t('verifyEmailAddressGoingTo')({ link: verificationUrl.href })}`,
  }
})
