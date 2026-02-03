import { Config, Context, Effect, flow, Layer, Redacted } from 'effect'
import { createTransport, type Transporter } from 'nodemailer'

export class Nodemailer extends Context.Tag('Nodemailer')<Nodemailer, Transporter<unknown>>() {}

export const make = (options: Redacted.Redacted<URL> | Transporter<unknown>): Effect.Effect<Transporter<unknown>> =>
  Redacted.isRedacted(options)
    ? Effect.sync(() => createTransport(Redacted.value(options).href))
    : Effect.succeed(options)

export const layer: (options: Parameters<typeof make>[0]) => Layer.Layer<Nodemailer> = flow(
  make,
  Layer.effect(Nodemailer),
)

export const layerConfig = (options: Config.Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrapEffect(Effect.andThen(Config.unwrap(options), layer))
