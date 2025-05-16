import { Effect } from 'effect'
import { Locale } from '../Context.js'
import { FeatureFlags } from '../feature-flags.js'
import { PageNotFound } from '../PageNotFound/index.js'
import { UserOnboardingService } from '../user-onboarding.js'
import { LoggedInUser } from '../user.js'
import { createMenuPage } from './MenuPage.js'

export const MenuPage = Effect.gen(function* () {
  const locale = yield* Locale
  const user = yield* Effect.serviceOption(LoggedInUser)
  const userOnboarding = yield* Effect.serviceOption(UserOnboardingService)
  const featureFlags = yield* FeatureFlags

  if (!featureFlags.canSeeDesignTweaks) {
    return yield* PageNotFound
  }

  return createMenuPage({ locale, user, userOnboarding })
})
