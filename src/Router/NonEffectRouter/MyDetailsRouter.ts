import { flow, pipe, Redacted } from 'effect'
import * as P from 'fp-ts-routing'
import type { Json } from 'fp-ts/lib/Json.js'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as T from 'fp-ts/lib/Task.js'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'
import { getAvatarFromCloudinary, removeAvatarFromCloudinary } from '../../cloudinary.js'
import {
  connectOrcid,
  connectOrcidCode,
  connectOrcidError,
  connectOrcidStart,
  disconnectOrcid,
} from '../../connect-orcid/index.js'
import { connectSlack, connectSlackCode, connectSlackError, connectSlackStart } from '../../connect-slack-page/index.js'
import { disconnectSlack } from '../../disconnect-slack-page/index.js'
import * as EffectToFpts from '../../EffectToFpts.js'
import { sendContactEmailAddressVerificationEmail } from '../../email.js'
import { withEnv } from '../../Fpts.js'
import * as Keyv from '../../keyv.js'
import {
  changeCareerStage,
  changeCareerStageVisibility,
  changeContactEmailAddress,
  changeLanguages,
  changeLanguagesVisibility,
  changeLocation,
  changeLocationVisibility,
  changeOpenForRequests,
  changeOpenForRequestsVisibility,
  changeResearchInterests,
  changeResearchInterestsVisibility,
  myDetails,
  removeAvatar,
  verifyContactEmailAddress,
} from '../../my-details-page/index.js'
import { sendEmailWithNodemailer } from '../../nodemailer.js'
import * as Routes from '../../routes.js'
import type { SlackUserId } from '../../slack-user-id.js'
import { addOrcidToSlackProfile, getUserFromSlack, removeOrcidFromSlackProfile } from '../../slack.js'
import { Uuid } from '../../types/index.js'
import type * as Response from '../Response.js'
import type { Env } from './index.js'

export const MyDetailsRouter = pipe(
  [
    pipe(
      Routes.myDetailsMatch.parser,
      P.map(() => (env: Env) => myDetails({ locale: env.locale, user: env.loggedInUser })),
    ),
    pipe(
      Routes.changeCareerStageMatch.parser,
      P.map(
        () => (env: Env) =>
          changeCareerStage({ body: env.body, method: env.method, locale: env.locale, user: env.loggedInUser }),
      ),
    ),
    pipe(
      Routes.connectOrcidMatch.parser,
      P.map(() => (env: Env) => connectOrcid({ locale: env.locale, user: env.loggedInUser })),
    ),
    pipe(
      Routes.connectOrcidStartMatch.parser,
      P.map(() => (env: Env) => connectOrcidStart({ locale: env.locale, user: env.loggedInUser })),
    ),
    pipe(
      Routes.connectOrcidCodeMatch.parser,
      P.map(
        ({ code }) =>
          (env: Env) =>
            connectOrcidCode({ code, locale: env.locale, user: env.loggedInUser }),
      ),
    ),
    pipe(
      Routes.connectOrcidErrorMatch.parser,
      P.map(
        ({ error }) =>
          (env: Env) =>
            RT.of(connectOrcidError({ error, locale: env.locale })),
      ),
    ),
    pipe(
      Routes.disconnectOrcidMatch.parser,
      P.map(() => (env: Env) => disconnectOrcid({ locale: env.locale, method: env.method, user: env.loggedInUser })),
    ),
    pipe(
      Routes.connectSlackMatch.parser,
      P.map(() => (env: Env) => connectSlack({ locale: env.locale, user: env.loggedInUser })),
    ),
    pipe(
      Routes.connectSlackStartMatch.parser,
      P.map(() => (env: Env) => connectSlackStart({ locale: env.locale, user: env.loggedInUser })),
    ),
    pipe(
      Routes.connectSlackCodeMatch.parser,
      P.map(
        ({ code, state }) =>
          (env: Env) =>
            connectSlackCode({ code, locale: env.locale, state, user: env.loggedInUser }),
      ),
    ),
    pipe(
      Routes.connectSlackErrorMatch.parser,
      P.map(
        ({ error }) =>
          (env: Env) =>
            RT.of(connectSlackError({ error, locale: env.locale })),
      ),
    ),
    pipe(
      Routes.disconnectSlackMatch.parser,
      P.map(() => (env: Env) => disconnectSlack({ locale: env.locale, method: env.method, user: env.loggedInUser })),
    ),
    pipe(
      Routes.removeAvatarMatch.parser,
      P.map(() => (env: Env) => removeAvatar({ locale: env.locale, method: env.method, user: env.loggedInUser })),
    ),
    pipe(
      Routes.changeCareerStageVisibilityMatch.parser,
      P.map(
        () => (env: Env) =>
          changeCareerStageVisibility({
            body: env.body,
            locale: env.locale,
            method: env.method,
            user: env.loggedInUser,
          }),
      ),
    ),
    pipe(
      Routes.changeOpenForRequestsMatch.parser,
      P.map(
        () => (env: Env) =>
          changeOpenForRequests({
            body: env.body,
            locale: env.locale,
            method: env.method,
            user: env.loggedInUser,
          }),
      ),
    ),
    pipe(
      Routes.changeOpenForRequestsVisibilityMatch.parser,
      P.map(
        () => (env: Env) =>
          changeOpenForRequestsVisibility({
            body: env.body,
            locale: env.locale,
            method: env.method,
            user: env.loggedInUser,
          }),
      ),
    ),
    pipe(
      Routes.changeResearchInterestsMatch.parser,
      P.map(
        () => (env: Env) =>
          changeResearchInterests({
            body: env.body,
            locale: env.locale,
            method: env.method,
            user: env.loggedInUser,
          }),
      ),
    ),
    pipe(
      Routes.changeResearchInterestsVisibilityMatch.parser,
      P.map(
        () => (env: Env) =>
          changeResearchInterestsVisibility({
            body: env.body,
            locale: env.locale,
            method: env.method,
            user: env.loggedInUser,
          }),
      ),
    ),
    pipe(
      Routes.changeLocationMatch.parser,
      P.map(
        () => (env: Env) =>
          changeLocation({
            body: env.body,
            locale: env.locale,
            method: env.method,
            user: env.loggedInUser,
          }),
      ),
    ),
    pipe(
      Routes.changeLanguagesMatch.parser,
      P.map(
        () => (env: Env) =>
          changeLanguages({
            body: env.body,
            locale: env.locale,
            method: env.method,
            user: env.loggedInUser,
          }),
      ),
    ),
    pipe(
      Routes.changeLocationVisibilityMatch.parser,
      P.map(
        () => (env: Env) =>
          changeLocationVisibility({
            body: env.body,
            locale: env.locale,
            method: env.method,
            user: env.loggedInUser,
          }),
      ),
    ),
    pipe(
      Routes.changeLanguagesVisibilityMatch.parser,
      P.map(
        () => (env: Env) =>
          changeLanguagesVisibility({
            body: env.body,
            locale: env.locale,
            method: env.method,
            user: env.loggedInUser,
          }),
      ),
    ),
    pipe(
      Routes.changeContactEmailAddressMatch.parser,
      P.map(
        () => (env: Env) =>
          changeContactEmailAddress({
            body: env.body,
            locale: env.locale,
            method: env.method,
            user: env.loggedInUser,
          }),
      ),
    ),
    pipe(
      Routes.verifyContactEmailAddressMatch.parser,
      P.map(
        ({ verify }) =>
          (env: Env) =>
            verifyContactEmailAddress({ locale: env.locale, user: env.loggedInUser, verify }),
      ),
    ),
  ],
  concatAll(P.getParserMonoid()),
  P.map(
    handler => (env: Env) =>
      handler(env)({
        addToSession: withEnv(
          (key: string, value: Json) =>
            typeof env.sessionId === 'string'
              ? Keyv.addToSession(env.sessionId, key, value)
              : RTE.left('unavailable' as const),
          { sessionStore: env.sessionStore, ...env.logger },
        ),
        deleteAvatar: withEnv(removeAvatarFromCloudinary, {
          cloudinaryApi: {
            cloudName: env.cloudinaryApiConfig.cloudName,
            key: Redacted.value(env.cloudinaryApiConfig.key),
            secret: Redacted.value(env.cloudinaryApiConfig.secret),
          },
          deleteCloudinaryAvatar: withEnv(Keyv.deleteAvatar, { avatarStore: env.users.avatarStore, ...env.logger }),
          fetch: env.fetch,
          getCloudinaryAvatar: withEnv(Keyv.getAvatar, { avatarStore: env.users.avatarStore, ...env.logger }),
          ...env.logger,
        }),
        deleteCareerStage: withEnv(Keyv.deleteCareerStage, {
          careerStageStore: env.users.careerStageStore,
          ...env.logger,
        }),
        deleteLanguages: withEnv(Keyv.deleteLanguages, {
          languagesStore: env.users.languagesStore,
          ...env.logger,
        }),
        deleteLocation: withEnv(Keyv.deleteLocation, {
          locationStore: env.users.locationStore,
          ...env.logger,
        }),
        deleteOrcidToken: withEnv(Keyv.deleteOrcidToken, { orcidTokenStore: env.users.orcidTokenStore, ...env.logger }),
        deleteResearchInterests: withEnv(Keyv.deleteResearchInterests, {
          researchInterestsStore: env.users.researchInterestsStore,
          ...env.logger,
        }),
        deleteSlackUserId: withEnv(
          (orcid: Orcid) =>
            pipe(
              RTE.of(orcid),
              RTE.chainFirst(
                flow(
                  Keyv.getSlackUserId,
                  RTE.chainW(removeOrcidFromSlackProfile),
                  RTE.orElseW(() => RTE.right(undefined)),
                ),
              ),
              RTE.chainW(Keyv.deleteSlackUserId),
            ),
          {
            fetch: env.fetch,
            slackApiToken: Redacted.value(env.slackApiConfig.apiToken),
            slackApiUpdate: env.slackApiConfig.apiUpdate,
            slackUserIdStore: env.users.slackUserIdStore,
            ...env.logger,
          },
        ),
        fetch: env.fetch,
        generateUuid: EffectToFpts.toIO(Uuid.generateUuid, env.runtime),
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
        getSlackUser: withEnv(
          flow(
            Keyv.getSlackUserId,
            RTE.chainW(({ userId }) => getUserFromSlack(userId)),
          ),
          {
            ...env.logger,
            slackUserIdStore: env.users.slackUserIdStore,
            slackApiToken: Redacted.value(env.slackApiConfig.apiToken),
            fetch: env.fetch,
          },
        ),
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
        isSlackUser: withEnv(
          flow(
            Keyv.getSlackUserId,
            RTE.map(() => true),
            RTE.orElseW(error =>
              match(error)
                .with('not-found', () => RTE.right(false))
                .with('unavailable', RTE.left)
                .exhaustive(),
            ),
          ),
          { slackUserIdStore: env.users.slackUserIdStore, ...env.logger },
        ),
        orcidOauth: {
          authorizeUrl: env.orcidOauth.authorizeUrl,
          clientId: env.orcidOauth.clientId,
          clientSecret: Redacted.value(env.orcidOauth.clientSecret),
          revokeUrl: env.orcidOauth.revokeUrl,
          tokenUrl: env.orcidOauth.tokenUrl,
        },
        popFromSession: withEnv(
          (key: string) =>
            typeof env.sessionId === 'string'
              ? Keyv.popFromSession(env.sessionId, key)
              : RTE.left('unavailable' as const),
          { sessionStore: env.sessionStore, ...env.logger },
        ),
        publicUrl: env.publicUrl,
        saveCareerStage: withEnv(Keyv.saveCareerStage, {
          careerStageStore: env.users.careerStageStore,
          ...env.logger,
        }),
        saveContactEmailAddress: withEnv(Keyv.saveContactEmailAddress, {
          contactEmailAddressStore: env.users.contactEmailAddressStore,
          ...env.logger,
        }),
        saveLanguages: withEnv(Keyv.saveLanguages, {
          languagesStore: env.users.languagesStore,
          ...env.logger,
        }),
        saveLocation: withEnv(Keyv.saveLocation, {
          locationStore: env.users.locationStore,
          ...env.logger,
        }),
        saveOpenForRequests: withEnv(Keyv.saveOpenForRequests, {
          isOpenForRequestsStore: env.users.isOpenForRequestsStore,
          ...env.logger,
        }),
        saveOrcidToken: withEnv(Keyv.saveOrcidToken, { orcidTokenStore: env.users.orcidTokenStore, ...env.logger }),
        saveResearchInterests: withEnv(Keyv.saveResearchInterests, {
          researchInterestsStore: env.users.researchInterestsStore,
          ...env.logger,
        }),
        saveSlackUserId: withEnv(
          (orcid: Orcid, slackUser: SlackUserId) =>
            pipe(
              Keyv.saveSlackUserId(orcid, slackUser),
              RTE.chainFirstW(() => addOrcidToSlackProfile(slackUser, orcid)),
            ),
          {
            fetch: env.fetch,
            slackApiToken: Redacted.value(env.slackApiConfig.apiToken),
            slackApiUpdate: env.slackApiConfig.apiUpdate,
            slackUserIdStore: env.users.slackUserIdStore,
            ...env.logger,
          },
        ),
        saveUserOnboarding: withEnv(Keyv.saveUserOnboarding, {
          userOnboardingStore: env.users.userOnboardingStore,
          ...env.logger,
        }),
        slackOauth: {
          authorizeUrl: env.slackOauth.authorizeUrl,
          clientId: env.slackOauth.clientId,
          clientSecret: Redacted.value(env.slackOauth.clientSecret),
          tokenUrl: env.slackOauth.tokenUrl,
        },
        verifyContactEmailAddress: withEnv(sendContactEmailAddressVerificationEmail, {
          locale: env.locale,
          publicUrl: env.publicUrl,
          sendEmail: withEnv(sendEmailWithNodemailer, { nodemailer: env.nodemailer, ...env.logger }),
        }),
      }),
  ),
) satisfies P.Parser<(env: Env) => T.Task<Response.Response>>
