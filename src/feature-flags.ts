import { Context, Data, Effect, Option } from 'effect'
import * as R from 'fp-ts/lib/Reader.js'
import { LoggedInUser } from './Context.js'
import type { User } from './user.js'

export class CanWriteFeedback extends Context.Tag('CanWriteFeedback')<CanWriteFeedback, (user?: User) => boolean>() {}

export class NotAllowedToWriteFeedback extends Data.TaggedError('NotAllowedToWriteFeedback') {}

export const EnsureCanWriteFeedback: Effect.Effect<void, NotAllowedToWriteFeedback> = Effect.gen(function* () {
  const user = yield* Effect.serviceOption(LoggedInUser)
  const canWriteFeedback = yield* Effect.serviceOption(CanWriteFeedback)

  if (Option.isNone(canWriteFeedback) || !canWriteFeedback.value(Option.getOrUndefined(user))) {
    yield* new NotAllowedToWriteFeedback()
  }
})

export interface CanWriteFeedbackEnv {
  canWriteFeedback: (user?: User) => boolean
}

export const canWriteFeedback = (user?: User) =>
  R.asks(({ canWriteFeedback }: CanWriteFeedbackEnv) => canWriteFeedback(user))

export interface CanChooseLocaleEnv {
  canChooseLocale: boolean
}

export interface CanConnectOrcidProfileEnv {
  canConnectOrcidProfile: (user: User) => boolean
}

export const canConnectOrcidProfile = (user: User) =>
  R.asks(({ canConnectOrcidProfile }: CanConnectOrcidProfileEnv) => canConnectOrcidProfile(user))

export interface CanUploadAvatarEnv {
  canUploadAvatar: (user: User) => boolean
}

export const canUploadAvatar = (user: User) =>
  R.asks(({ canUploadAvatar }: CanUploadAvatarEnv) => canUploadAvatar(user))

export interface CanRequestReviewsEnv {
  canRequestReviews: (user?: User) => boolean
}

export const canRequestReviews = (user?: User) =>
  R.asks(({ canRequestReviews }: CanRequestReviewsEnv) => canRequestReviews(user))

export interface CanSeeGatesLogoEnv {
  canSeeGatesLogo: boolean
}

export const canSeeGatesLogo = R.asks(({ canSeeGatesLogo }: CanSeeGatesLogoEnv) => canSeeGatesLogo)

export interface CanUseSearchQueriesEnv {
  canUseSearchQueries: (user?: User) => boolean
}

export const canUseSearchQueries = (user?: User) =>
  R.asks(({ canUseSearchQueries }: CanUseSearchQueriesEnv) => canUseSearchQueries(user))
