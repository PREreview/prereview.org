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
import type { UnverifiedContactEmailAddress } from './contact-email-address'
import { RawHtmlC, html } from './html'
import { toUrl } from './public-url'
import { verifyContactEmailAddressMatch } from './routes'
import { type EmailAddress, EmailAddressC } from './types/email-address'
import type { User } from './user'

export interface MailjetApiEnv {
  mailjetApi: {
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

const SendEmailE = E.struct({
  From: E.struct({ Email: EmailAddressC, name: E.id<string>() }),
  To: E.tuple(E.struct({ Email: EmailAddressC, name: E.id<string>() })),
  Subject: E.id<string>(),
  TextPart: E.id<string>(),
  HtmlPart: RawHtmlC,
}) satisfies E.Encoder<Json, never>

const SentEmailD = pipe(JsonD, D.compose(D.struct({ Messages: D.tuple(D.struct({ Status: D.literal('success') })) })))

export const sendContactEmailAddressVerificationEmail = (user: User, emailAddress: UnverifiedContactEmailAddress) =>
  pipe(
    RTE.fromReader(toUrl(verifyContactEmailAddressMatch.formatter, { verify: emailAddress.verificationToken })),
    RTE.map(
      verificationUrl =>
        ({
          From: { Email: 'help@prereview.org' as EmailAddress, name: 'PREreview' },
          To: [{ Email: emailAddress.value, name: user.name }],
          Subject: 'Verify your email address on PREreview',
          TextPart: `Hi ${user.name},\n\nPlease verify your email address on PREreview by going to ${verificationUrl.href}`,
          HtmlPart: html`
            <p>Hi ${user.name},</p>
            <p>
              Please verify your email address on PREreview: <a href="${verificationUrl.href}">Verify email address</a>
            </p>
          `,
        }) satisfies E.TypeOf<typeof SendEmailE>,
    ),
    RTE.chainW(sendEmail),
  )

const sendEmail = (email: E.TypeOf<typeof SendEmailE>) =>
  pipe(
    RTE.asks(({ mailjetApi: { sandbox } }: MailjetApiEnv) =>
      pipe(
        'https://api.mailjet.com/v3.1/send',
        F.Request('POST'),
        F.setBody(JSON.stringify({ Messages: [SendEmailE.encode(email)], SandboxMode: sandbox }), 'application/json'),
      ),
    ),
    RTE.chainReaderK(addMailjetApiHeaders),
    RTE.chainW(F.send),
    RTE.mapLeft(() => 'network-error' as const),
    RTE.filterOrElseW(F.hasStatus(Status.OK), () => 'non-200-response' as const),
    RTE.chainTaskEitherKW(flow(F.decode(SentEmailD), TE.mapLeft(D.draw))),
    RTE.orElseFirstW(RTE.fromReaderIOK(flow(error => ({ error }), L.errorP('Failed to send email through Mailjet')))),
    RTE.bimap(() => 'unavailable' as const, constVoid),
  )

function addMailjetApiHeaders(request: F.Request) {
  return R.asks(({ mailjetApi: { key, secret } }: MailjetApiEnv) =>
    pipe(request, F.setHeaders({ Authorization: `Basic ${btoa(`${key}:${secret}`)}` })),
  )
}
