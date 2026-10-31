import { Config, Context, Effect, Layer, Option } from 'effect'
import { EnabledLocales } from '../Context.ts'
import * as FeatureFlags from '../FeatureFlags.ts'
import type { Html } from '../html.ts'
import { type Page, page as templatePage } from './page.ts'

export type { Page } from './page.ts'

export class TemplatePage extends Context.Service<TemplatePage, (page: Page) => Html>()('TemplatePage') {}

export class TemplatePageOptions extends Context.Service<
  TemplatePageOptions,
  {
    readonly fathomId: Option.Option<string>
    readonly environmentLabel: Option.Option<'dev' | 'sandbox'>
  }
>()('TemplatePageOptions') {}

export const make = Effect.gen(function* () {
  const canLogInAsDemoUser = yield* FeatureFlags.canLogInAsDemoUser
  const useCrowdinInContext = yield* FeatureFlags.useCrowdinInContext
  const { fathomId, environmentLabel } = yield* TemplatePageOptions
  const enabledLocales = yield* EnabledLocales

  return (page: Page) =>
    templatePage({
      page,
      canLogInAsDemoUser,
      useCrowdinInContext,
      environmentLabel: Option.getOrUndefined(environmentLabel),
      fathomId: Option.getOrUndefined(fathomId),
      enabledLocales,
    })
})

export const layer = Layer.effect(TemplatePage, make)

export const optionsLayer = (options: typeof TemplatePageOptions.Service): Layer.Layer<TemplatePageOptions> =>
  Layer.succeed(TemplatePageOptions, options)

export const optionsLayerConfig = (options: Config.Wrap<Parameters<typeof optionsLayer>[0]>) =>
  Layer.unwrap(Effect.map(Config.unwrap(options), optionsLayer))
