import { Effect, Schema } from 'effect'
import { Email, UnableToSendEmail } from './Email.ts'
import { NodemailerTransporter } from './Nodemailer.ts'

export const SendEmail = Effect.fn('Nodemailer.sendEmail')(function* (
  email: Email,
): Effect.fn.Return<void, UnableToSendEmail, NodemailerTransporter> {
  const transporter = yield* NodemailerTransporter

  const encoded = yield* Effect.mapError(Schema.encode(Email)(email), error => new UnableToSendEmail({ cause: error }))

  yield* Effect.tryPromise({
    try: () => transporter.sendMail(encoded),
    catch: error => new UnableToSendEmail({ cause: error }),
  })
})
