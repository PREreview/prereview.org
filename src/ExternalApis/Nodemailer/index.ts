import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { NodemailerTransporter } from './Nodemailer.ts'
import { SendEmail } from './SendEmail.ts'

export { Email, UnableToSendEmail } from './Email.ts'
export * from './legacy-nodemailer.ts'
export * from './Nodemailer.ts'

export class Nodemailer extends Context.Tag('Nodemailer')<
  Nodemailer,
  {
    sendEmail: (
      ...args: Parameters<typeof SendEmail>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof SendEmail>>,
      Effect.Effect.Error<ReturnType<typeof SendEmail>>
    >
  }
>() {}

export const { sendEmail } = Effect.serviceFunctions(Nodemailer)

export const make: Effect.Effect<typeof Nodemailer.Service, never, NodemailerTransporter> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<NodemailerTransporter>(), Context.omit(Scope.Scope))

  return {
    sendEmail: flow(SendEmail, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Nodemailer, make)
