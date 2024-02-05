import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import type { Uuid } from 'uuid-ts'
import type { UnverifiedContactEmailAddress } from './contact-email-address'
import { type Html, html, mjmlToHtml, plainText } from './html'
import type { PreprintTitle } from './preprint'
import { type PublicUrlEnv, toUrl } from './public-url'
import {
  authorInviteMatch,
  authorInviteVerifyEmailAddressMatch,
  verifyContactEmailAddressMatch,
  writeReviewVerifyEmailAddressMatch,
} from './routes'
import type { EmailAddress } from './types/email-address'
import type { IndeterminatePreprintId } from './types/preprint-id'
import type { NonEmptyString } from './types/string'
import type { User } from './user'

export interface SendEmailEnv {
  sendEmail: (email: Email) => TE.TaskEither<'unavailable', void>
}

export interface Email {
  readonly from: { readonly name: string; readonly address: EmailAddress }
  readonly to: { readonly name: string; readonly address: EmailAddress }
  readonly subject: string
  readonly text: string
  readonly html: Html
}

export const sendEmail = (email: Email): RTE.ReaderTaskEither<SendEmailEnv, 'unavailable', void> =>
  R.asks(({ sendEmail }) => sendEmail(email))

export const sendContactEmailAddressVerificationEmail = (
  user: User,
  emailAddress: UnverifiedContactEmailAddress,
): RTE.ReaderTaskEither<SendEmailEnv & PublicUrlEnv, 'unavailable', void> =>
  pipe(
    RTE.fromReader(toUrl(verifyContactEmailAddressMatch.formatter, { verify: emailAddress.verificationToken })),
    RTE.map(
      verificationUrl =>
        ({
          from: { address: 'help@prereview.org' as EmailAddress, name: 'PREreview' },
          to: { address: emailAddress.value, name: user.name },
          subject: 'Verify your email address on PREreview',
          text: `Hi ${user.name},\n\nPlease verify your email address on PREreview by going to ${verificationUrl.href}`,
          html: mjmlToHtml(html`
            <mjml>
              <mj-body>
                <mj-section>
                  <mj-column>
                    <mj-text>Hi ${user.name},</mj-text>
                    <mj-text>Please verify your email address on PREreview:</mj-text>
                    <mj-button href="${verificationUrl.href}" target="_self">Verify email address</mj-button>
                  </mj-column>
                </mj-section>
              </mj-body>
            </mjml>
          `),
        }) satisfies Email,
    ),
    RTE.chainW(sendEmail),
  )

export const sendContactEmailAddressVerificationEmailForReview = (
  user: User,
  emailAddress: UnverifiedContactEmailAddress,
  preprint: IndeterminatePreprintId,
): RTE.ReaderTaskEither<SendEmailEnv & PublicUrlEnv, 'unavailable', void> =>
  pipe(
    RTE.fromReader(
      toUrl(writeReviewVerifyEmailAddressMatch.formatter, { id: preprint, verify: emailAddress.verificationToken }),
    ),
    RTE.map(
      verificationUrl =>
        ({
          from: { address: 'help@prereview.org' as EmailAddress, name: 'PREreview' },
          to: { address: emailAddress.value, name: user.name },
          subject: 'Verify your email address on PREreview',
          text: `Hi ${user.name},\n\nPlease verify your email address on PREreview by going to ${verificationUrl.href}`,
          html: mjmlToHtml(html`
            <mjml>
              <mj-body>
                <mj-section>
                  <mj-column>
                    <mj-text>Hi ${user.name},</mj-text>
                    <mj-text>Please verify your email address on PREreview:</mj-text>
                    <mj-button href="${verificationUrl.href}" target="_self">Verify email address</mj-button>
                  </mj-column>
                </mj-section>
              </mj-body>
            </mjml>
          `),
        }) satisfies Email,
    ),
    RTE.chainW(sendEmail),
  )

export const createContactEmailAddressVerificationEmailForInvitedAuthor = ({
  user,
  emailAddress,
  authorInvite,
}: {
  user: User
  emailAddress: UnverifiedContactEmailAddress
  authorInvite: Uuid
}): R.Reader<PublicUrlEnv, Email> =>
  pipe(
    toUrl(authorInviteVerifyEmailAddressMatch.formatter, { id: authorInvite, verify: emailAddress.verificationToken }),
    R.map(
      verificationUrl =>
        ({
          from: { address: 'help@prereview.org' as EmailAddress, name: 'PREreview' },
          to: { address: emailAddress.value, name: user.name },
          subject: 'Verify your email address on PREreview',
          text: `Hi ${user.name},\n\nPlease verify your email address on PREreview by going to ${verificationUrl.href}`,
          html: mjmlToHtml(html`
            <mjml>
              <mj-body>
                <mj-section>
                  <mj-column>
                    <mj-text>Hi ${user.name},</mj-text>
                    <mj-text>Please verify your email address on PREreview:</mj-text>
                    <mj-button href="${verificationUrl.href}" target="_self">Verify email address</mj-button>
                  </mj-column>
                </mj-section>
              </mj-body>
            </mjml>
          `),
        }) satisfies Email,
    ),
  )

export const createAuthorInviteEmail = (
  person: { name: NonEmptyString; emailAddress: EmailAddress },
  authorInviteId: Uuid,
  newPrereview: { author: string; preprint: PreprintTitle },
): R.Reader<PublicUrlEnv, Email> =>
  pipe(
    toUrl(authorInviteMatch.formatter, { id: authorInviteId }),
    R.map(
      inviteUrl =>
        ({
          from: { address: 'help@prereview.org' as EmailAddress, name: 'PREreview' },
          to: { address: person.emailAddress, name: person.name },
          subject: 'Be listed as a PREreview author',
          text: `
Hi ${person.name},

Thank you for contributing to a recent review of “${plainText(newPrereview.preprint.title).toString()}” published on PREreview.org!

${newPrereview.author} has invited you to appear as an author on the PREreview. You can be listed by going to ${inviteUrl.href}

All the best,
PREreview
`.trim(),
          html: mjmlToHtml(html`
            <mjml>
              <mj-body>
                <mj-section>
                  <mj-column>
                    <mj-text>Hi ${person.name},</mj-text>
                    <mj-text
                      >Thank you for contributing to a recent review of “${newPrereview.preprint.title}” published on
                      <a href="https://prereview.org/">PREreview.org</a>!
                    </mj-text>
                    <mj-text>${newPrereview.author} has invited you to appear as an author on the PREreview:</mj-text>
                    <mj-button href="${inviteUrl.href}" target="_self">Be listed as an author</mj-button>
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
        }) satisfies Email,
    ),
  )
