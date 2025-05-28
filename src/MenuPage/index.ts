import { Effect } from 'effect'
import { Locale } from '../Context.js'
import { UserOnboardingService } from '../user-onboarding.js'
import { LoggedInUser } from '../user.js'
import { createMenuPage } from './MenuPage.js'

export const MenuPage = Effect.gen(function* () {
  const locale = yield* Locale
  const user = yield* Effect.serviceOption(LoggedInUser)
  const userOnboarding = yield* Effect.serviceOption(UserOnboardingService)

  return createMenuPage({ locale, user, userOnboarding })
})
