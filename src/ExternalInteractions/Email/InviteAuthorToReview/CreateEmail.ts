import { Effect } from 'effect'
import type { LanguageCode } from 'iso-639-1'
import rtlDetect from 'rtl-detect'
import type { Nodemailer } from '../../../ExternalApis/index.ts'
import { type Html, html, mjmlToHtml, plainText } from '../../../html.ts'
import { DefaultLocale } from '../../../locales/index.ts'
import { forRoute, type PublicUrl } from '../../../public-url.ts'
import * as Routes from '../../../routes.ts'
import { EmailAddress, type NonEmptyString, type Uuid } from '../../../types/index.ts'

export const CreateEmail: (details: {
  invitationId: Uuid.Uuid
  inviter: NonEmptyString.NonEmptyString
  invitee: { name: NonEmptyString.NonEmptyString; emailAddress: EmailAddress.EmailAddress }
  subject: {
    language: LanguageCode
    title: Html
  }
}) => Effect.Effect<Nodemailer.Email, never, PublicUrl> = Effect.fnUntraced(function* ({
  invitationId,
  inviter,
  invitee,
  subject,
}) {
  const locale = DefaultLocale

  const inviteUrl = yield* forRoute(Routes.AuthorInviteStartNow, { invitationId })
  const homePage = yield* forRoute(Routes.HomePage)

  return {
    from: { address: EmailAddress.EmailAddress('help@prereview.org'), name: 'PREreview' },
    to: { address: invitee.emailAddress, name: invitee.name },
    subject: 'Be listed as a PREreview author',
    html: yield* mjmlToHtml(html`
      <mjml lang="${locale}" dir="${rtlDetect.getLangDir(locale)}">
        <mj-head>
          <mj-attributes>
            <mj-button border="transparent solid"></mj-button>
          </mj-attributes>
        </mj-head>
        <mj-body>
          <mj-section>
            <mj-column>
              <mj-text>Hi ${invitee.name},</mj-text>
              <mj-text>
                Thank you for contributing to a recent review of “<span
                  lang="${subject.language}"
                  dir="${rtlDetect.getLangDir(subject.language)}"
                  >${subject.title}</span
                >” published on <a href="${homePage.href}">PREreview</a>!
              </mj-text>
              <mj-text>${inviter} has invited you to appear as an author on the PREreview.</mj-text>
              <mj-button href="${inviteUrl.href}">Be listed as an author</mj-button>
              <mj-text>You can also choose not to be listed by ignoring this email.</mj-text>
              <mj-text>
                If you have any questions, please let us know at
                <a href="mailto:help@prereview.org">help@prereview.org</a>.
              </mj-text>
              <mj-text>All the best,<br />PREreview</mj-text>
            </mj-column>
          </mj-section>
        </mj-body>
      </mjml>
    `),
    text: plainText`
Hi ${invitee.name},

Thank you for contributing to a recent review of “${subject.title}” published on PREreview!

${inviter} has invited you to appear as an author on the PREreview.

You can be listed by going to:

  ${inviteUrl.href}

You can also choose not to be listed by ignoring this email.

If you have any questions, please let us know at help@prereview.org.

All the best,
PREreview
`
      .toString()
      .trim(),
  }
})
