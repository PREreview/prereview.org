import { Config, Context, Effect, Option } from 'effect'
import type { Html } from './html.js'
import { type Page, page as templatePage } from './page.js'

export type { Page } from './page.js'

export class TemplatePage extends Context.Tag('TemplatePage')<TemplatePage, (page: Page) => Html>() {}

export const make = Effect.gen(function* () {
  const publicUrl = yield* Config.mapAttempt(Config.string('PUBLIC_URL'), url => new URL(url))
  const fathomId = yield* Config.option(Config.string('FATHOM_SITE_ID'))
  const environmentLabel = yield* Config.option(Config.literal('dev', 'sandbox')('ENVIRONMENT_LABEL'))

  return (page: Page) =>
    templatePage(page)({
      environmentLabel: Option.getOrUndefined(environmentLabel),
      fathomId: Option.getOrUndefined(fathomId),
      publicUrl,
    })
})
