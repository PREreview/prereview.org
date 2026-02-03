import { Context, Effect, flow, Layer, Scope } from 'effect'
import type { Nodemailer } from '../../ExternalApis/index.ts'
import { AcknowledgeReviewRequest } from './AcknowledgeReviewRequest/index.ts'

export * from './legacy-email.ts'

export class Email extends Context.Tag('Email')<
  Email,
  {
    acknowledgeReviewRequest: (
      ...args: Parameters<typeof AcknowledgeReviewRequest>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof AcknowledgeReviewRequest>>,
      Effect.Effect.Error<ReturnType<typeof AcknowledgeReviewRequest>>
    >
  }
>() {}

export const { acknowledgeReviewRequest } = Effect.serviceFunctions(Email)

export const make: Effect.Effect<typeof Email.Service, never, Nodemailer.Nodemailer> = Effect.gen(function* () {
  const context = yield* Effect.andThen(Effect.context<Nodemailer.Nodemailer>(), Context.omit(Scope.Scope))

  return {
    acknowledgeReviewRequest: flow(AcknowledgeReviewRequest, Effect.provide(context)),
  }
})

export const layer = Layer.effect(Email, make)
