import type * as RTE from 'fp-ts/ReaderTaskEither'
import * as TE from 'fp-ts/TaskEither'
import type * as E from 'io-ts/Encoder'
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

export const sendEmailWithNodemailer = (email: Email): RTE.ReaderTaskEither<NodemailerEnv, 'unavailable', void> =>
  TE.tryCatchK(
    async ({ nodemailer }) => {
      await nodemailer.sendMail(emailToNodemailerEmail.encode(email))
    },
    () => 'unavailable' as const,
  )
