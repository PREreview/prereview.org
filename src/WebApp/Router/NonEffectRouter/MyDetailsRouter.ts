import { Effect, flow, pipe, Redacted } from 'effect'
import * as P from 'fp-ts-routing'
import type { Json } from 'fp-ts/lib/Json.js'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import type * as T from 'fp-ts/lib/Task.js'
import { CommunitySlack } from '../../../ExternalInteractions/index.ts'
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
import { changeContactEmailAddress, myDetails } from '../../my-details-page/index.ts'
import type * as Response from '../../Response/index.ts'
import type { Env } from './index.ts'
import { withLegacyReadErrors } from './LegacyStoreErrors.ts'

export const MyDetailsRouter = pipe(
  [
    pipe(
      Routes.myDetailsMatch.parser,
      P.map(() => (env: Env) => myDetails({ locale: env.locale, user: env.loggedInUser })),
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
        deleteOrcidToken: EffectToFpts.toTaskEitherK(OrcidTokens.remove, env.runtime),
        deleteSlackUserId: EffectToFpts.toTaskEitherK(
          Effect.fnUntraced(function* (orcid: OrcidId) {
            yield* pipe(
              SlackUserIds.get(orcid),
              Effect.andThen(CommunitySlack.removeOrcidFromSlackProfile),
              Effect.ignore({ log: 'Error', message: 'Failed to remove ORCID iD from Slack profile' }),
            )

            yield* SlackUserIds.remove(orcid)
          }),
          env.runtime,
        ),
        fetch: env.fetch,
        generateUuid: EffectToFpts.toIO(Uuid.v4(), env.runtime),
        getUserOnboarding: EffectToFpts.toTaskEitherK(UserOnboardingStore.get, env.runtime),
        getOrcidToken: EffectToFpts.toTaskEitherK(OrcidTokens.get, env.runtime),
        getAvatar: EffectToFpts.toTaskEitherK(
          flow(
            Prereviewers.Avatars.get,
            Effect.catchTags({
              AvatarNotFound: () => Effect.fail('not-found' as const),
              AvatarUnavailable: () => Effect.fail('unavailable' as const),
            }),
          ),
          env.runtime,
        ),
        getSlackUser: EffectToFpts.toTaskEitherK(
          flow(
            SlackUserIds.get,
            Effect.andThen(({ userId }) =>
              Effect.mapError(CommunitySlack.getSlackUser(userId), () => 'unavailable' as const),
            ),
          ),
          env.runtime,
        ),
        isOpenForRequests: EffectToFpts.toTaskEitherK(
          withLegacyReadErrors(Prereviewers.IsOpenForRequestsStore.get),
          env.runtime,
        ),
        getCareerStage: EffectToFpts.toTaskEitherK(withLegacyReadErrors(Prereviewers.CareerStages.get), env.runtime),
        getResearchInterests: EffectToFpts.toTaskEitherK(
          withLegacyReadErrors(Prereviewers.ResearchInterestsStore.get),
          env.runtime,
        ),
        getLocation: EffectToFpts.toTaskEitherK(withLegacyReadErrors(Prereviewers.Locations.get), env.runtime),
        getLanguages: EffectToFpts.toTaskEitherK(withLegacyReadErrors(Prereviewers.LanguagesStore.get), env.runtime),
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
        saveOrcidToken: EffectToFpts.toTaskEitherK(OrcidTokens.save, env.runtime),
        saveSlackUserId: EffectToFpts.toTaskEitherK(
          Effect.fnUntraced(function* (orcid: OrcidId, slackUser: SlackUserId) {
            yield* SlackUserIds.save(orcid, slackUser)

            yield* pipe(
              CommunitySlack.addOrcidToSlackProfile(slackUser, orcid),
              Effect.tapCause(cause => Effect.logError('Failed to add ORCID iD to Slack profile', cause)),
              Effect.mapError(() => 'unavailable' as const),
            )
          }),
          env.runtime,
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
