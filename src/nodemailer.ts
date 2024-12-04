import { Config, type ConfigError, Context, Effect, Layer } from 'effect'
import { toError } from 'fp-ts/lib/Either.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as TE from 'fp-ts/lib/TaskEither.js'
import { flow, pipe } from 'fp-ts/lib/function.js'
import type * as E from 'io-ts/lib/Encoder.js'
import * as L from 'logger-fp-ts'
import { createTransport, type SendMailOptions, type Transporter } from 'nodemailer'
import type { Email } from './email.js'

export interface NodemailerEnv {
  nodemailer: Transporter<unknown>
}

export class Nodemailer extends Context.Tag('Nodemailer')<Nodemailer, Transporter<unknown>>() {}

export const make = (options: URL | Transporter<unknown>): Effect.Effect<Transporter<unknown>> =>
  options instanceof URL ? Effect.sync(() => createTransport(options.href)) : Effect.succeed(options)

export const layer: (options: Parameters<typeof make>[0]) => Layer.Layer<Nodemailer> = flow(
  make,
  Layer.effect(Nodemailer),
)

export const layerConfig: (
  options: Config.Config.Wrap<Parameters<typeof make>[0]>,
) => Layer.Layer<Nodemailer, ConfigError.ConfigError> = flow(
  Config.unwrap,
  Effect.andThen(make),
  Layer.effect(Nodemailer),
)

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
