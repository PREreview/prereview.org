import { Config, Context, Effect, flow, Layer, Redacted } from 'effect'
import { createTransport, type Transporter } from 'nodemailer'

export class NodemailerTransporter extends Context.Tag('NodemailerTransporter')<
  NodemailerTransporter,
  Transporter<unknown>
>() {}

export const makeTransporter = (
  options: Redacted.Redacted<URL> | Transporter<unknown>,
): Effect.Effect<Transporter<unknown>> =>
  Redacted.isRedacted(options)
    ? Effect.sync(() => createTransport(Redacted.value(options).href))
    : Effect.succeed(options)

export const layerTransporter: (options: Parameters<typeof makeTransporter>[0]) => Layer.Layer<NodemailerTransporter> =
  flow(makeTransporter, Layer.effect(NodemailerTransporter))

export const layerTransporterConfig = (options: Config.Config.Wrap<Parameters<typeof layerTransporter>[0]>) =>
  Layer.unwrapEffect(Effect.andThen(Config.unwrap(options), layerTransporter))
