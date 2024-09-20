import { Context, Data, Effect, Option } from 'effect'
import * as R from 'fp-ts/lib/Reader.js'
import { EnsureUserIsLoggedIn, type User, type UserIsNotLoggedIn } from './user.js'

export class CanWriteFeedback extends Context.Tag('CanWriteFeedback')<CanWriteFeedback, (user: User) => boolean>() {}

export class NotAllowedToWriteFeedback extends Data.TaggedError('NotAllowedToWriteFeedback') {}

export const EnsureCanWriteFeedback: Effect.Effect<void, NotAllowedToWriteFeedback | UserIsNotLoggedIn> = Effect.gen(
  function* () {
    const user = yield* EnsureUserIsLoggedIn
    const canWriteFeedback = yield* Effect.serviceOption(CanWriteFeedback)

    if (Option.isNone(canWriteFeedback) || !canWriteFeedback.value(user)) {
      yield* new NotAllowedToWriteFeedback()
    }
  },
)

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
