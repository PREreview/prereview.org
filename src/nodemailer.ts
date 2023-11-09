import { toError } from 'fp-ts/Either'
import * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import type * as E from 'io-ts/Encoder'
import * as L from 'logger-fp-ts'
import type { SendMailOptions, Transporter } from 'nodemailer'
import type { Email } from './email'

export interface NodemailerEnv {
  nodemailer: Transporter<unknown>
}

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
