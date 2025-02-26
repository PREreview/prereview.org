import { Config, type ConfigError, Context, Data, Effect, Layer, Option } from 'effect'
import * as R from 'fp-ts/lib/Reader.js'
import { LoggedInUser, type User } from './user.js'

export class RequiresAVerifiedEmailAddress extends Context.Tag('RequiresAVerifiedEmailAddress')<
  RequiresAVerifiedEmailAddress,
  boolean
>() {}

export class CanWriteComments extends Context.Tag('CanWriteComments')<CanWriteComments, (user?: User) => boolean>() {}

export class CanChooseLocale extends Context.Tag('CanChooseLocale')<CanChooseLocale, boolean>() {}

export class UseCrowdinInContext extends Context.Tag('UseCrowdinInContext')<UseCrowdinInContext, boolean>() {}

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

export interface MustDeclareUseOfAiEnv {
  mustDeclareUseOfAi: boolean
}

export const mustDeclareUseOfAi = R.asks(({ mustDeclareUseOfAi }: MustDeclareUseOfAiEnv) => mustDeclareUseOfAi)

export const layer = (options: {
  canChooseLocale: typeof CanChooseLocale.Service
  canWriteComments: typeof CanWriteComments.Service
  requiresAVerifiedEmailAddress: typeof RequiresAVerifiedEmailAddress.Service
  useCrowdinInContext: typeof UseCrowdinInContext.Service
}): Layer.Layer<
  CanChooseLocale | CanWriteComments | RequiresAVerifiedEmailAddress | UseCrowdinInContext,
  ConfigError.ConfigError
> =>
  Layer.succeedContext(
    Context.empty().pipe(
      Context.add(CanChooseLocale, options.canChooseLocale),
      Context.add(CanWriteComments, options.canWriteComments),
      Context.add(RequiresAVerifiedEmailAddress, options.requiresAVerifiedEmailAddress),
      Context.add(UseCrowdinInContext, options.useCrowdinInContext),
    ),
  )

export const layerConfig = (options: Config.Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrapEffect(Effect.map(Config.unwrap(options), layer))
