import { Config, Context, Effect, Option } from 'effect'
import { CanChooseLocale } from './feature-flags.js'
import type { Html } from './html.js'
import { type Page, page as templatePage } from './page.js'
import { PublicUrl } from './public-url.js'

export type { Page } from './page.js'

export class TemplatePage extends Context.Tag('TemplatePage')<TemplatePage, (page: Page) => Html>() {}

export const make = Effect.gen(function* () {
  const publicUrl = yield* PublicUrl
  const fathomId = yield* Config.option(Config.string('FATHOM_SITE_ID'))
  const environmentLabel = yield* Config.option(Config.literal('dev', 'sandbox')('ENVIRONMENT_LABEL'))
  const canChooseLocale = yield* CanChooseLocale

  return (page: Page) =>
    templatePage(page)({
      canChooseLocale,
      environmentLabel: Option.getOrUndefined(environmentLabel),
      fathomId: Option.getOrUndefined(fathomId),
      publicUrl,
    })
})
