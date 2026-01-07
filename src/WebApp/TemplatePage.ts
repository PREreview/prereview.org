import { Config, Context, Effect, Layer, Option } from 'effect'
import * as FeatureFlags from '../FeatureFlags.ts'
import type { Html } from '../html.ts'
import { PublicUrl } from '../public-url.ts'
import { type Page, page as templatePage } from './page.ts'

export type { Page } from './page.ts'

export class TemplatePage extends Context.Tag('TemplatePage')<TemplatePage, (page: Page) => Html>() {}

export class TemplatePageOptions extends Context.Tag('TemplatePageOptions')<
  TemplatePageOptions,
  {
    readonly fathomId: Option.Option<string>
    readonly environmentLabel: Option.Option<'dev' | 'sandbox'>
  }
>() {}

export const make = Effect.gen(function* () {
  const publicUrl = yield* PublicUrl
  const canLogInAsDemoUser = yield* FeatureFlags.canLogInAsDemoUser
  const canSubscribeToReviewRequests = yield* FeatureFlags.canSubscribeToReviewRequests
  const useCrowdinInContext = yield* FeatureFlags.useCrowdinInContext
  const { fathomId, environmentLabel } = yield* TemplatePageOptions

  return (page: Page) =>
    templatePage({
      page,
      canLogInAsDemoUser,
      canSubscribeToReviewRequests,
      useCrowdinInContext,
      environmentLabel: Option.getOrUndefined(environmentLabel),
      fathomId: Option.getOrUndefined(fathomId),
      publicUrl,
    })
})

export const layer = Layer.effect(TemplatePage, make)

export const optionsLayer = (options: typeof TemplatePageOptions.Service): Layer.Layer<TemplatePageOptions> =>
  Layer.succeed(TemplatePageOptions, options)

export const optionsLayerConfig = (options: Config.Config.Wrap<Parameters<typeof optionsLayer>[0]>) =>
  Layer.unwrapEffect(Effect.andThen(Config.unwrap(options), optionsLayer))
