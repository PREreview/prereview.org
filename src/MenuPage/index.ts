import { Effect } from 'effect'
import { Locale } from '../Context.ts'
import * as FeatureFlags from '../FeatureFlags.ts'
import { UserOnboardingService } from '../user-onboarding.ts'
import { LoggedInUser } from '../user.ts'
import { createMenuPage } from './MenuPage.ts'

export const MenuPage = Effect.gen(function* () {
  const locale = yield* Locale
  const user = yield* Effect.serviceOption(LoggedInUser)
  const userOnboarding = yield* Effect.serviceOption(UserOnboardingService)
  const canLogInAsDemoUser = yield* FeatureFlags.canLogInAsDemoUser
  const canSubscribeToReviewRequests = yield* FeatureFlags.canSubscribeToReviewRequests

  return createMenuPage({ canLogInAsDemoUser, canSubscribeToReviewRequests, locale, user, userOnboarding })
})
