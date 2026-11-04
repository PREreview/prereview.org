import { NodeStream } from '@effect/platform-node'
import { Effect, flow, pipe, Redacted } from 'effect'
import * as P from 'fp-ts-routing'
import type { Json } from 'fp-ts/lib/Json.js'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as T from 'fp-ts/lib/Task.js'
import { Cloudinary } from '../../../ExternalApis/index.ts'
import { CommunitySlack } from '../../../ExternalInteractions/index.ts'
import { withEnv } from '../../../Fpts.ts'
import * as LegacySessionStore from '../../../legacy-session-store.ts'
import * as OrcidTokens from '../../../OrcidTokens.ts'
import * as SlackUserIds from '../../../SlackUserIds.ts'
import * as UserOnboardingStore from '../../../UserOnboardingStore.ts'
import * as Prereviewers from '../../../Prereviewers/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import * as Routes from '../../../routes.ts'
import type { SlackUserId } from '../../../slack-user-id.ts'
import { Uuid } from '../../../types/index.ts'
import type { OrcidId } from '../../../types/OrcidId.ts'
import {
  connectOrcid,
  connectOrcidCode,
  connectOrcidError,
  connectOrcidStart,
  disconnectOrcid,
} from '../../connect-orcid/index.ts'
import { connectSlack, connectSlackCode, connectSlackError, connectSlackStart } from '../../connect-slack-page/index.ts'
import { disconnectSlack } from '../../disconnect-slack-page/index.ts'
import {
  changeAvatar,
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
} from '../../my-details-page/index.ts'
import type * as Response from '../../Response/index.ts'
import type { Env } from './index.ts'

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
      Routes.changeAvatarMatch.parser,
      P.map(
        () => (env: Env) =>
          changeAvatar({
            body: env.body,
            locale: env.locale,
            method: env.method,
            user: env.loggedInUser,
          }),
      ),
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
  ],
  concatAll(P.getParserMonoid()),
  P.map(
    handler => (env: Env) =>
      handler(env)({
        addToSession: EffectToFpts.toTaskEitherK(
          (key: string, value: Json) =>
            typeof env.sessionId === 'string'
              ? LegacySessionStore.addToSession(env.sessionId, key, value)
              : Effect.fail('unavailable' as const),
          env.runtime,
        ),
        deleteAvatar: withEnv(Cloudinary.removeAvatarFromCloudinary, {
          cloudinaryApi: {
            cloudName: env.cloudinaryApiConfig.cloudName,
            key: Redacted.value(env.cloudinaryApiConfig.key),
            secret: Redacted.value(env.cloudinaryApiConfig.secret),
          },
          deleteCloudinaryAvatar: EffectToFpts.toTaskEitherK(Prereviewers.Avatars.remove, env.runtime),
          fetch: env.fetch,
          getCloudinaryAvatar: EffectToFpts.toTaskEitherK(Prereviewers.Avatars.get, env.runtime),
          ...env.logger,
        }),
        deleteCareerStage: EffectToFpts.toTaskEitherK(Prereviewers.CareerStages.remove, env.runtime),
        deleteLanguages: EffectToFpts.toTaskEitherK(Prereviewers.LanguagesStore.remove, env.runtime),
        deleteLocation: EffectToFpts.toTaskEitherK(Prereviewers.Locations.remove, env.runtime),
        deleteOrcidToken: EffectToFpts.toTaskEitherK(OrcidTokens.remove, env.runtime),
        deleteResearchInterests: EffectToFpts.toTaskEitherK(Prereviewers.ResearchInterestsStore.remove, env.runtime),
        deleteSlackUserId: withEnv(
          (orcid: OrcidId) =>
            pipe(
              RTE.of(orcid),
              RTE.chainFirst(
                flow(
                  EffectToFpts.toReaderTaskEitherK(SlackUserIds.get),
                  RTE.chainW(CommunitySlack.removeOrcidFromSlackProfile),
                  RTE.orElseW(() => RTE.right(undefined)),
                ),
              ),
              RTE.chainW(EffectToFpts.toReaderTaskEitherK(SlackUserIds.remove)),
            ),
          {
            fetch: env.fetch,
            runtime: env.runtime,
            slackApiToken: Redacted.value(env.slackApiConfig.apiToken),
            slackApiUpdate: env.shouldUpdateCommunitySlack,
            ...env.logger,
          },
        ),
        fetch: env.fetch,
        generateUuid: EffectToFpts.toIO(Uuid.v4(), env.runtime),
        getUserOnboarding: EffectToFpts.toTaskEitherK(UserOnboardingStore.get, env.runtime),
        getOrcidToken: EffectToFpts.toTaskEitherK(OrcidTokens.get, env.runtime),
        getAvatar: withEnv(Cloudinary.getAvatarFromCloudinary, {
          getCloudinaryAvatar: EffectToFpts.toTaskEitherK(Prereviewers.Avatars.get, env.runtime),
          cloudinaryApi: {
            cloudName: env.cloudinaryApiConfig.cloudName,
            key: Redacted.value(env.cloudinaryApiConfig.key),
            secret: Redacted.value(env.cloudinaryApiConfig.secret),
          },
        }),
        getSlackUser: EffectToFpts.toTaskEitherK(
          flow(
            SlackUserIds.get,
            Effect.andThen(({ userId }) =>
              Effect.mapError(CommunitySlack.getSlackUser(userId), () => 'unavailable' as const),
            ),
          ),
          env.runtime,
        ),
        isOpenForRequests: EffectToFpts.toTaskEitherK(Prereviewers.IsOpenForRequestsStore.get, env.runtime),
        getCareerStage: EffectToFpts.toTaskEitherK(Prereviewers.CareerStages.get, env.runtime),
        getResearchInterests: EffectToFpts.toTaskEitherK(Prereviewers.ResearchInterestsStore.get, env.runtime),
        getLocation: EffectToFpts.toTaskEitherK(Prereviewers.Locations.get, env.runtime),
        getLanguages: EffectToFpts.toTaskEitherK(Prereviewers.LanguagesStore.get, env.runtime),
        isSlackUser: EffectToFpts.toTaskEitherK(
          flow(
            SlackUserIds.get,
            Effect.as(true),
            Effect.catchIf(
              error => error === 'not-found',
              () => Effect.succeed(false),
            ),
          ),
          env.runtime,
        ),
        orcidOauth: {
          authorizeUrl: env.orcidOauth.authorizeUrl,
          clientId: env.orcidOauth.clientId,
          clientSecret: Redacted.value(env.orcidOauth.clientSecret),
          revokeUrl: env.orcidOauth.revokeUrl,
          tokenUrl: env.orcidOauth.tokenUrl,
        },
        popFromSession: EffectToFpts.toTaskEitherK(
          (key: string) =>
            typeof env.sessionId === 'string'
              ? LegacySessionStore.popFromSession(env.sessionId, key)
              : Effect.fail('unavailable' as const),
          env.runtime,
        ),
        publicUrl: env.publicUrl,
        runtime: env.runtime,
        saveAvatar: withEnv(Cloudinary.saveAvatarOnCloudinary, {
          cloudinaryApi: {
            cloudName: env.cloudinaryApiConfig.cloudName,
            key: Redacted.value(env.cloudinaryApiConfig.key),
            secret: Redacted.value(env.cloudinaryApiConfig.secret),
          },
          fetch: env.fetch,
          getCloudinaryAvatar: EffectToFpts.toTaskEitherK(Prereviewers.Avatars.get, env.runtime),
          readFile: flow(env.fileSystem.stream, NodeStream.toReadableNever),
          saveCloudinaryAvatar: EffectToFpts.toTaskEitherK(Prereviewers.Avatars.save, env.runtime),
          publicUrl: env.publicUrl,
          ...env.logger,
        }),
        saveCareerStage: EffectToFpts.toTaskEitherK(Prereviewers.CareerStages.save, env.runtime),
        saveLanguages: EffectToFpts.toTaskEitherK(Prereviewers.LanguagesStore.save, env.runtime),
        saveLocation: EffectToFpts.toTaskEitherK(Prereviewers.Locations.save, env.runtime),
        saveOpenForRequests: EffectToFpts.toTaskEitherK(Prereviewers.IsOpenForRequestsStore.save, env.runtime),
        saveOrcidToken: EffectToFpts.toTaskEitherK(OrcidTokens.save, env.runtime),
        saveResearchInterests: EffectToFpts.toTaskEitherK(Prereviewers.ResearchInterestsStore.save, env.runtime),
        saveSlackUserId: withEnv(
          (orcid: OrcidId, slackUser: SlackUserId) =>
            pipe(
              EffectToFpts.toReaderTaskEither(SlackUserIds.save(orcid, slackUser)),
              RTE.chainFirstW(() => CommunitySlack.addOrcidToSlackProfile(slackUser, orcid)),
            ),
          {
            fetch: env.fetch,
            runtime: env.runtime,
            slackApiToken: Redacted.value(env.slackApiConfig.apiToken),
            slackApiUpdate: env.shouldUpdateCommunitySlack,
            ...env.logger,
          },
        ),
        saveUserOnboarding: EffectToFpts.toTaskEitherK(UserOnboardingStore.save, env.runtime),
        slackOauth: {
          authorizeUrl: env.slackOauth.authorizeUrl,
          clientId: env.slackOauth.clientId,
          clientSecret: Redacted.value(env.slackOauth.clientSecret),
          tokenUrl: env.slackOauth.tokenUrl,
        },
        ...env.logger,
      }),
  ),
) satisfies P.Parser<(env: Env) => T.Task<Response.Response>>
