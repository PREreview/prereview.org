import { flow, pipe } from 'effect'
import { toError } from 'fp-ts/lib/Either.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import type * as E from 'io-ts/lib/Encoder.js'
import * as L from 'logger-fp-ts'
import type { SendMailOptions, Transporter } from 'nodemailer'
import type { Email } from './Email.ts'

export interface NodemailerEnv {
  nodemailer: Transporter<unknown>
}

export interface SendEmailEnv {
  sendEmail: (email: Email) => TE.TaskEither<'unavailable', void>
}

export const sendEmail = (email: Email): RTE.ReaderTaskEither<SendEmailEnv, 'unavailable', void> =>
  R.asks(({ sendEmail }) => sendEmail(email))

const emailToNodemailerEmail: E.Encoder<SendMailOptions, Email> = {
  encode: email => ({
    from: email.from,
    to: email.to,
    subject: email.subject,
    text: email.text,
    html: email.html.toString(),
  }),
}

export const sendEmailWithNodemailer = (
  email: Email,
): RTE.ReaderTaskEither<NodemailerEnv & L.LoggerEnv, 'unavailable', void> =>
  pipe(
    RTE.asksReaderTaskEither(
      RTE.fromTaskEitherK(
        TE.tryCatchK(
          ({ nodemailer }: NodemailerEnv) => nodemailer.sendMail(emailToNodemailerEmail.encode(email)),
          toError,
        ),
      ),
    ),
    RTE.orElseFirstW(RTE.fromReaderIOK(flow(error => ({ error: error.message }), L.errorP('Failed to send email')))),
    RTE.bimap(
      () => 'unavailable' as const,
      () => undefined,
    ),
  )
