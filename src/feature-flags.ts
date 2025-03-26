import { Config, type ConfigError, Context, Effect, Layer } from 'effect'
import * as R from 'fp-ts/lib/Reader.js'
import type { User } from './user.js'

export class CanAddMultipleAuthors extends Context.Tag('CanAddMultipleAuthors')<
  CanAddMultipleAuthors,
  (user?: User) => boolean
>() {}

export class CanChooseLocale extends Context.Tag('CanChooseLocale')<CanChooseLocale, boolean>() {}

export class UseCrowdinInContext extends Context.Tag('UseCrowdinInContext')<UseCrowdinInContext, boolean>() {}

export interface MustDeclareUseOfAiEnv {
  mustDeclareUseOfAi: boolean
}

export const mustDeclareUseOfAi = R.asks(({ mustDeclareUseOfAi }: MustDeclareUseOfAiEnv) => mustDeclareUseOfAi)

export const layer = (options: {
  canAddMultipleAuthors: typeof CanAddMultipleAuthors.Service
  canChooseLocale: typeof CanChooseLocale.Service
  useCrowdinInContext: typeof UseCrowdinInContext.Service
}): Layer.Layer<CanAddMultipleAuthors | CanChooseLocale | UseCrowdinInContext, ConfigError.ConfigError> =>
  Layer.succeedContext(
    Context.empty().pipe(
      Context.add(CanAddMultipleAuthors, options.canAddMultipleAuthors),
      Context.add(CanChooseLocale, options.canChooseLocale),
      Context.add(UseCrowdinInContext, options.useCrowdinInContext),
    ),
  )

export const layerConfig = (options: Config.Config.Wrap<Parameters<typeof layer>[0]>) =>
  Layer.unwrapEffect(Effect.map(Config.unwrap(options), layer))
