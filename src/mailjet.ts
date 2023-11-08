import * as F from 'fetch-fp-ts'
import { mapLeft } from 'fp-ts/Either'
import type { Json } from 'fp-ts/Json'
import * as J from 'fp-ts/Json'
import * as R from 'fp-ts/Reader'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { constVoid, flow, pipe } from 'fp-ts/function'
import { Status } from 'hyper-ts'
import * as D from 'io-ts/Decoder'
import * as E from 'io-ts/Encoder'
import * as L from 'logger-fp-ts'
import nodemailer from 'nodemailer'
import type { UnverifiedContactEmailAddress } from './contact-email-address'
import { type Html, RawHtmlC, html, mjmlToHtml } from './html'
import { toUrl } from './public-url'
import { verifyContactEmailAddressMatch } from './routes'
import { type EmailAddress, EmailAddressC } from './types/email-address'
import type { User } from './user'

export interface MailjetApiEnv {
  mailjetApi?: {
    key: string
    secret: string
    sandbox: boolean
  }
}

const JsonD = {
  decode: (s: string) =>
    pipe(
      J.parse(s),
      mapLeft(() => D.error(s, 'JSON')),
    ),
}

const emailToMailjetEmail = (email: Email): E.TypeOf<typeof SendEmailE> => ({
  From: { Email: email.from.address, name: email.from.name },
  To: [{ Email: email.to.address, name: email.to.name }],
  Subject: email.subject,
  TextPart: email.text,
  HtmlPart: email.html,
})

const SendEmailE = E.struct({
  From: E.struct({ Email: EmailAddressC, name: E.id<string>() }),
  To: E.tuple(E.struct({ Email: EmailAddressC, name: E.id<string>() })),
  Subject: E.id<string>(),
  TextPart: E.id<string>(),
  HtmlPart: RawHtmlC,
}) satisfies E.Encoder<Json, never>

const SentEmailD = pipe(JsonD, D.compose(D.struct({ Messages: D.tuple(D.struct({ Status: D.literal('success') })) })))

interface Email {
  readonly from: { readonly name: string; readonly address: EmailAddress }
  readonly to: { readonly name: string; readonly address: EmailAddress }
  readonly subject: string
  readonly text: string
  readonly html: Html
}

const createContactEmailAddressVerificationEmail = (user: User, emailAddress: UnverifiedContactEmailAddress) =>
  pipe(
    toUrl(verifyContactEmailAddressMatch.formatter, { verify: emailAddress.verificationToken }),
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

const sendEmail = (email: Email) =>
  RTE.asksReaderTaskEitherW(({ mailjetApi }: MailjetApiEnv) =>
    mailjetApi
      ? pipe(
          'https://api.mailjet.com/v3.1/send',
          F.Request('POST'),
          F.setBody(
            JSON.stringify({
              Messages: [SendEmailE.encode(emailToMailjetEmail(email))],
              SandboxMode: mailjetApi.sandbox,
            }),
            'application/json',
          ),
          F.setHeaders({ Authorization: `Basic ${btoa(`${mailjetApi.key}:${mailjetApi.secret}`)}` }),
          F.send,
          RTE.mapLeft(() => 'network-error' as const),
          RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'non-200-response' as const),
          RTE.chainTaskEitherKW(flow(F.decode(SentEmailD), TE.mapLeft(D.draw))),
          RTE.orElseFirstW(
            RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to send email through Mailjet'))),
          ),
          RTE.bimap(() => 'unavailable' as const, constVoid),
        )
      : RTE.fromTaskEither(sendToLocalMailcatcher(email)),
  )

const sendToLocalMailcatcher = (email: Email): TE.TaskEither<'unavailable', void> => {
  const transporter = nodemailer.createTransport({
    host: 'localhost',
    port: 1025,
    secure: false,
    auth: {
      user: '',
      pass: '',
    },
  })

  return TE.tryCatch(
    async () => {
      await transporter.sendMail({
        from: email.from,
        to: email.to,
        subject: email.subject,
        text: email.text,
        html: email.html.toString(),
      })
    },
    () => 'unavailable' as const,
  )
}

export const sendContactEmailAddressVerificationEmail = flow(
  RTE.fromReaderK(createContactEmailAddressVerificationEmail),
  RTE.chainW(sendEmail),
)
