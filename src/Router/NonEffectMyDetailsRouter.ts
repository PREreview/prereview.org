import { pipe, Redacted } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import type * as T from 'fp-ts/lib/Task.js'
import { getSlackUser } from '../app-router.js'
import { getAvatarFromCloudinary } from '../cloudinary.js'
import { withEnv } from '../Fpts.js'
import * as Keyv from '../keyv.js'
import { myDetails } from '../my-details-page/index.js'
import * as Routes from '../routes.js'
import type { Env } from './NonEffectRouter.js'
import type * as Response from './Response.js'

export const MyDetailsRouter = pipe(
  [
    pipe(
      Routes.myDetailsMatch.parser,
      P.map(
        () => (env: Env) =>
          myDetails({ locale: env.locale, user: env.loggedInUser })({
            getUserOnboarding: withEnv(Keyv.getUserOnboarding, {
              userOnboardingStore: env.users.userOnboardingStore,
              ...env.logger,
            }),
            getOrcidToken: withEnv(Keyv.getOrcidToken, {
              orcidTokenStore: env.users.orcidTokenStore,
              ...env.logger,
            }),
            getAvatar: withEnv(getAvatarFromCloudinary, {
              getCloudinaryAvatar: withEnv(Keyv.getAvatar, { avatarStore: env.users.avatarStore, ...env.logger }),
              cloudinaryApi: {
                cloudName: env.cloudinaryApiConfig.cloudName,
                key: Redacted.value(env.cloudinaryApiConfig.key),
                secret: Redacted.value(env.cloudinaryApiConfig.secret),
              },
            }),
            getSlackUser: withEnv(getSlackUser, {
              ...env.logger,
              slackUserIdStore: env.users.slackUserIdStore,
              slackApiToken: Redacted.value(env.slackApiConfig.apiToken),
              fetch: env.fetch,
            }),
            getContactEmailAddress: withEnv(Keyv.getContactEmailAddress, {
              contactEmailAddressStore: env.users.contactEmailAddressStore,
              ...env.logger,
            }),
            isOpenForRequests: withEnv(Keyv.isOpenForRequests, {
              isOpenForRequestsStore: env.users.isOpenForRequestsStore,
              ...env.logger,
            }),
            getCareerStage: withEnv(Keyv.getCareerStage, {
              careerStageStore: env.users.careerStageStore,
              ...env.logger,
            }),
            getResearchInterests: withEnv(Keyv.getResearchInterests, {
              researchInterestsStore: env.users.researchInterestsStore,
              ...env.logger,
            }),
            getLocation: withEnv(Keyv.getLocation, {
              locationStore: env.users.locationStore,
              ...env.logger,
            }),
            getLanguages: withEnv(Keyv.getLanguages, {
              languagesStore: env.users.languagesStore,
              ...env.logger,
            }),
            saveUserOnboarding: withEnv(Keyv.saveUserOnboarding, {
              userOnboardingStore: env.users.userOnboardingStore,
              ...env.logger,
            }),
          }),
      ),
    ),
  ],
  concatAll(P.getParserMonoid()),
) satisfies P.Parser<(env: Env) => T.Task<Response.Response>>
