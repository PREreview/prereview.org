import { Context, Effect, flow, Layer, Scope } from 'effect'
import { Locale } from '../../Context.ts'
import type { Nodemailer } from '../../ExternalApis/index.ts'
import type { PublicUrl } from '../../public-url.ts'
import { AcknowledgeReviewRequest } from './AcknowledgeReviewRequest/index.ts'
import { InviteAuthor } from './InviteAuthor/index.ts'
import { InviteAuthorToReview } from './InviteAuthorToReview/index.ts'
import { NotifyRequesterOfReview } from './NotifyRequesterOfReview/index.ts'
import { VerifyContactEmailAddress } from './VerifyContactEmailAddress/index.ts'

export class Email extends Context.Tag('Email')<
  Email,
  {
    acknowledgeReviewRequest: (
      ...args: Parameters<typeof AcknowledgeReviewRequest>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof AcknowledgeReviewRequest>>,
      Effect.Effect.Error<ReturnType<typeof AcknowledgeReviewRequest>>
    >
    inviteAuthor: (
      ...args: Parameters<typeof InviteAuthor>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof InviteAuthor>>,
      Effect.Effect.Error<ReturnType<typeof InviteAuthor>>,
      Locale
    >
    inviteAuthorToReview: (
      ...args: Parameters<typeof InviteAuthorToReview>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof InviteAuthorToReview>>,
      Effect.Effect.Error<ReturnType<typeof InviteAuthorToReview>>
    >
    notifyRequesterOfReview: (
      ...args: Parameters<typeof NotifyRequesterOfReview>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof NotifyRequesterOfReview>>,
      Effect.Effect.Error<ReturnType<typeof NotifyRequesterOfReview>>
    >
    verifyContactEmailAddress: (
      ...args: Parameters<typeof VerifyContactEmailAddress>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof VerifyContactEmailAddress>>,
      Effect.Effect.Error<ReturnType<typeof VerifyContactEmailAddress>>,
      Locale
    >
  }
>() {}

export const acknowledgeReviewRequest = (...args: Parameters<(typeof Email.Service)['acknowledgeReviewRequest']>) =>
  Effect.flatMap(Email, service => service.acknowledgeReviewRequest(...args))

export const inviteAuthor = (...args: Parameters<(typeof Email.Service)['inviteAuthor']>) =>
  Effect.flatMap(Email, service => service.inviteAuthor(...args))

export const inviteAuthorToReview = (...args: Parameters<(typeof Email.Service)['inviteAuthorToReview']>) =>
  Effect.flatMap(Email, service => service.inviteAuthorToReview(...args))

export const notifyRequesterOfReview = (...args: Parameters<(typeof Email.Service)['notifyRequesterOfReview']>) =>
  Effect.flatMap(Email, service => service.notifyRequesterOfReview(...args))

export const verifyContactEmailAddress = (...args: Parameters<(typeof Email.Service)['verifyContactEmailAddress']>) =>
  Effect.flatMap(Email, service => service.verifyContactEmailAddress(...args))

export const make: Effect.Effect<typeof Email.Service, never, Nodemailer.Nodemailer | PublicUrl> = Effect.gen(
  function* () {
    const context = yield* Effect.map(
      Effect.context<Nodemailer.Nodemailer | PublicUrl>(),
      Context.omit(Scope.Scope, Locale),
    )

    return {
      acknowledgeReviewRequest: flow(AcknowledgeReviewRequest, Effect.provide(context)),
      inviteAuthor: flow(InviteAuthor, Effect.provide(context)),
      inviteAuthorToReview: flow(InviteAuthorToReview, Effect.provide(context)),
      notifyRequesterOfReview: flow(NotifyRequesterOfReview, Effect.provide(context)),
      verifyContactEmailAddress: flow(VerifyContactEmailAddress, Effect.provide(context)),
    }
  },
)

export const layer = Layer.effect(Email, make)
