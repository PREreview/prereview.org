import { Effect } from 'effect'
import { app } from './app.ts'
import { AllowSiteCrawlers } from './Context.ts'
import * as FeatureFlags from './FeatureFlags.ts'
import { PublicUrl } from './public-url.ts'

export const expressServer = Effect.gen(function* () {
  const publicUrl = yield* PublicUrl
  const useCrowdinInContext = yield* FeatureFlags.useCrowdinInContext
  const allowSiteCrawlers = yield* AllowSiteCrawlers

  return app({
    allowSiteCrawlers,
    publicUrl,
    useCrowdinInContext,
  })
})
