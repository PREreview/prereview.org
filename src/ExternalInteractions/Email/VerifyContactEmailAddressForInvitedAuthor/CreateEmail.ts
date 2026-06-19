import { Effect } from 'effect'
import { format } from 'fp-ts-routing'
import type { UnverifiedContactEmailAddress } from '../../../contact-email-address.ts'
import { Locale } from '../../../Context.ts'
import type { Nodemailer } from '../../../ExternalApis/index.ts'
import { html, mjmlToHtml, plainText } from '../../../html.ts'
import { languageAttributesFor } from '../../../Locales.ts'
import { translate } from '../../../locales/index.ts'
import { forRoute, type PublicUrl } from '../../../public-url.ts'
import * as Routes from '../../../routes.ts'
import { EmailAddress, type NonEmptyString, type Uuid } from '../../../types/index.ts'

export const CreateEmail: (details: {
  name: NonEmptyString.NonEmptyString
  emailAddress: UnverifiedContactEmailAddress
  authorInvite: Uuid.Uuid
}) => Effect.Effect<Nodemailer.Email, never, Locale | PublicUrl> = Effect.fnUntraced(function* ({
  name,
  emailAddress,
  authorInvite,
}) {
  const locale = yield* Locale

  const t = translate(locale, 'email')

  const verificationUrl = yield* forRoute(Routes.VerifyEmailAddress, {
    verificationToken: emailAddress.verificationToken,
    redirectTo: format(Routes.authorInviteCheckMatch.formatter, { id: authorInvite }) as `/${string}`,
  })

  return {
    from: { address: EmailAddress.EmailAddress('help@prereview.org'), name: 'PREreview' },
    to: { address: emailAddress.value, name },
    subject: plainText(t('verifyEmailAddressTitle')()).toString(),
    html: yield* mjmlToHtml(html`
      <mjml ${languageAttributesFor(locale)}>
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
    text: plainText`${t('hiName')({ name })}

${t('verifyEmailAddressGoingTo')({ link: verificationUrl.href })}`.toString(),
  }
})
