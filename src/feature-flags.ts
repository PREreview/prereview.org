import { Config, type ConfigError, Context, Data, Effect, Layer, Option, pipe } from 'effect'
import * as R from 'fp-ts/lib/Reader.js'
import { LoggedInUser, type User } from './user.js'

export class RequiresAVerifiedEmailAddress extends Context.Tag('RequiresAVerifiedEmailAddress')<
  RequiresAVerifiedEmailAddress,
  boolean
>() {}

export class CanWriteComments extends Context.Tag('CanWriteComments')<CanWriteComments, (user?: User) => boolean>() {}

export class NotAllowedToWriteComments extends Data.TaggedError('NotAllowedToWriteComments') {}

export const EnsureCanWriteComments: Effect.Effect<void, NotAllowedToWriteComments> = Effect.gen(function* () {
  const user = yield* Effect.serviceOption(LoggedInUser)
  const canWriteComments = yield* Effect.serviceOption(CanWriteComments)

  if (Option.isNone(canWriteComments) || !canWriteComments.value(Option.getOrUndefined(user))) {
    yield* new NotAllowedToWriteComments()
  }
})

export interface CanWriteCommentsEnv {
  canWriteComments: (user?: User) => boolean
}

export const canWriteComments = (user?: User) =>
  R.asks(({ canWriteComments }: CanWriteCommentsEnv) => canWriteComments(user))

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

export const layer = (options: {
  canWriteComments: typeof CanWriteComments.Service
  requiresAVerifiedEmailAddress: typeof RequiresAVerifiedEmailAddress.Service
}): Layer.Layer<CanWriteComments | RequiresAVerifiedEmailAddress, ConfigError.ConfigError> =>
  Layer.succeedContext(
    pipe(
      Context.make(CanWriteComments, options.canWriteComments),
      Context.add(RequiresAVerifiedEmailAddress, options.requiresAVerifiedEmailAddress),
    ),
  )

export const layerConfig = (options: Config.Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrapEffect(Effect.map(Config.unwrap(options), layer))
