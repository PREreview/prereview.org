import { Context, Effect, flow, Layer, Scope } from 'effect'
import { Locale } from '../../Context.ts'
import type { Nodemailer } from '../../ExternalApis/index.ts'
import type { PublicUrl } from '../../public-url.ts'
import { AcknowledgeReviewRequest } from './AcknowledgeReviewRequest/index.ts'
import { InviteAuthor } from './InviteAuthor/index.ts'
import { VerifyContactEmailAddress } from './VerifyContactEmailAddress/index.ts'
import { VerifyContactEmailAddressForComment } from './VerifyContactEmailAddressForComment/index.ts'
import { VerifyContactEmailAddressForInvitedAuthor } from './VerifyContactEmailAddressForInvitedAuthor/index.ts'
import { VerifyContactEmailAddressForReview } from './VerifyContactEmailAddressForReview/index.ts'

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
    verifyContactEmailAddress: (
      ...args: Parameters<typeof VerifyContactEmailAddress>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof VerifyContactEmailAddress>>,
      Effect.Effect.Error<ReturnType<typeof VerifyContactEmailAddress>>,
      Locale
    >
    verifyContactEmailAddressForReview: (
      ...args: Parameters<typeof VerifyContactEmailAddressForReview>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof VerifyContactEmailAddressForReview>>,
      Effect.Effect.Error<ReturnType<typeof VerifyContactEmailAddressForReview>>,
      Locale
    >
    verifyContactEmailAddressForInvitedAuthor: (
      ...args: Parameters<typeof VerifyContactEmailAddressForInvitedAuthor>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof VerifyContactEmailAddressForInvitedAuthor>>,
      Effect.Effect.Error<ReturnType<typeof VerifyContactEmailAddressForInvitedAuthor>>,
      Locale
    >
    verifyContactEmailAddressForComment: (
      ...args: Parameters<typeof VerifyContactEmailAddressForComment>
    ) => Effect.Effect<
      Effect.Effect.Success<ReturnType<typeof VerifyContactEmailAddressForComment>>,
      Effect.Effect.Error<ReturnType<typeof VerifyContactEmailAddressForComment>>,
      Locale
    >
  }
>() {}

export const {
  acknowledgeReviewRequest,
  inviteAuthor,
  verifyContactEmailAddress,
  verifyContactEmailAddressForReview,
  verifyContactEmailAddressForInvitedAuthor,
  verifyContactEmailAddressForComment,
} = Effect.serviceFunctions(Email)

export const make: Effect.Effect<typeof Email.Service, never, Nodemailer.Nodemailer | PublicUrl> = Effect.gen(
  function* () {
    const context = yield* Effect.andThen(
      Effect.context<Nodemailer.Nodemailer | PublicUrl>(),
      Context.omit(Scope.Scope, Locale),
    )

    return {
      acknowledgeReviewRequest: flow(AcknowledgeReviewRequest, Effect.provide(context)),
      inviteAuthor: flow(InviteAuthor, Effect.provide(context)),
      verifyContactEmailAddress: flow(VerifyContactEmailAddress, Effect.provide(context)),
      verifyContactEmailAddressForReview: flow(VerifyContactEmailAddressForReview, Effect.provide(context)),
      verifyContactEmailAddressForInvitedAuthor: flow(
        VerifyContactEmailAddressForInvitedAuthor,
        Effect.provide(context),
      ),
      verifyContactEmailAddressForComment: flow(VerifyContactEmailAddressForComment, Effect.provide(context)),
    }
  },
)

export const layer = Layer.effect(Email, make)
