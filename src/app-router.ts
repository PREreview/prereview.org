import type { HttpClient } from '@effect/platform'
import { Array, Function, pipe } from 'effect'
import type { FetchEnv } from 'fetch-fp-ts'
import * as P from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as R from 'fp-ts/lib/Reader.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import httpErrors from 'http-errors'
import type { ResponseEnded, StatusOpen } from 'hyper-ts'
import { route } from 'hyper-ts-routing'
import type { SessionEnv } from 'hyper-ts-session'
import * as RM from 'hyper-ts/lib/ReaderMiddleware.js'
import type * as L from 'logger-fp-ts'
import { match } from 'ts-pattern'
import type * as CachingHttpClient from './CachingHttpClient/index.js'
import type { Locale } from './Context.js'
import type { EffectEnv } from './EffectToFpts.js'
import type * as FeatureFlags from './FeatureFlags.js'
import { withEnv } from './Fpts.js'
import type * as OpenAlex from './OpenAlex/index.js'
import * as StatusCodes from './StatusCodes.js'
import type * as Zenodo from './Zenodo/index.js'
import type { CloudinaryApiEnv } from './cloudinary.js'
import type { OrcidOAuthEnv as ConnectOrcidOAuthEnv } from './connect-orcid/index.js'
import type { SlackOAuthEnv } from './connect-slack-page/index.js'
import type { SendEmailEnv } from './email.js'
import * as Keyv from './keyv.js'
import {
  type LegacyPrereviewApiEnv,
  createUserOnLegacyPrereview,
  getPseudonymFromLegacyPrereview,
  getUsersFromLegacyPrereview,
} from './legacy-prereview.js'
import type { SupportedLocale } from './locales/index.js'
import {
  type IsUserBlockedEnv,
  type OrcidOAuthEnv,
  authenticate,
  authenticateError,
  logIn,
  logOut,
} from './log-in/index.js'
import type { OrcidApi } from './orcid.js'
import type { TemplatePageEnv } from './page.js'
import type { GetPreprintEnv, GetPreprintIdEnv, GetPreprintTitleEnv, ResolvePreprintIdEnv } from './preprint.js'
import type * as PrereviewCoarNotify from './prereview-coar-notify/index.js'
import type { PrereviewCoarNotifyEnv } from './prereview-coar-notify/index.js'
import type { PublicUrlEnv } from './public-url.js'
import { handleResponse } from './response.js'
import { reviewsData } from './reviews-data/index.js'
import {
  logInMatch,
  logOutMatch,
  orcidCodeMatch,
  orcidErrorMatch,
  reviewsDataMatch,
  scietyListMatch,
  usersDataMatch,
} from './routes.js'
import { type ScietyListEnv, scietyList } from './sciety-list/index.js'
import type { AddToSessionEnv, PopFromSessionEnv } from './session.js'
import type { SlackApiEnv, SlackApiUpdateEnv } from './slack.js'
import type { Orcid } from './types/Orcid.js'
import type { GenerateUuid, GenerateUuidEnv } from './types/uuid.js'
import type { GetUserOnboardingEnv } from './user-onboarding.js'
import type { User } from './user.js'
import { usersData } from './users-data/index.js'
import type { FormStoreEnv } from './write-review/index.js'
import { type WasPrereviewRemovedEnv, getPrereviewsForSciety } from './zenodo.js'

export type RouterEnv = Keyv.AvatarStoreEnv &
  EffectEnv<
    | CachingHttpClient.HttpCache
    | FeatureFlags.FeatureFlags
    | Locale
    | OpenAlex.GetCategories
    | GenerateUuid
    | HttpClient.HttpClient
    | OrcidApi
    | PrereviewCoarNotify.PrereviewCoarNotifyConfig
    | Zenodo.ZenodoApi
  > &
  ResolvePreprintIdEnv &
  GetPreprintIdEnv &
  GenerateUuidEnv &
  GetPreprintEnv &
  GetPreprintTitleEnv &
  GetUserOnboardingEnv &
  Keyv.AuthorInviteStoreEnv &
  Keyv.CareerStageStoreEnv &
  CloudinaryApiEnv &
  ConnectOrcidOAuthEnv &
  Keyv.ContactEmailAddressStoreEnv &
  FormStoreEnv &
  Keyv.IsOpenForRequestsStoreEnv &
  IsUserBlockedEnv &
  Keyv.LanguagesStoreEnv &
  LegacyPrereviewApiEnv &
  Keyv.LocationStoreEnv & { locale: SupportedLocale; user?: User } & L.LoggerEnv &
  Keyv.OrcidTokenStoreEnv &
  OrcidOAuthEnv &
  PrereviewCoarNotifyEnv &
  PublicUrlEnv &
  Keyv.ResearchInterestsStoreEnv &
  Keyv.ReviewRequestStoreEnv &
  ScietyListEnv &
  SendEmailEnv &
  SessionEnv &
  SlackApiEnv &
  SlackApiUpdateEnv &
  SlackOAuthEnv &
  Keyv.SlackUserIdStoreEnv &
  TemplatePageEnv &
  Keyv.UserOnboardingStoreEnv &
  AddToSessionEnv &
  PopFromSessionEnv &
  WasPrereviewRemovedEnv &
  FetchEnv

const router: P.Parser<RM.ReaderMiddleware<RouterEnv, StatusOpen, ResponseEnded, never, void>> = pipe(
  [
    pipe(
      logInMatch.parser,
      P.map(() => logIn),
    ),
    pipe(
      logOutMatch.parser,
      P.map(() => logOut),
    ),
    pipe(
      orcidCodeMatch.parser,
      P.map(({ code, state }) => authenticate(code, state)),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getPseudonym: withEnv(
            (user: { orcid: Orcid; name: string }) =>
              pipe(
                getPseudonymFromLegacyPrereview(user.orcid),
                RTE.orElse(error =>
                  match(error)
                    .with('not-found', () => createUserOnLegacyPrereview(user))
                    .with('unavailable', RTE.left)
                    .exhaustive(),
                ),
              ),
            env,
          ),
        })),
      ),
    ),
    pipe(
      orcidErrorMatch.parser,
      P.map(({ error }) =>
        pipe(
          RM.of({}),
          RM.apS('error', RM.of(error)),
          RM.apSW(
            'locale',
            RM.asks((env: RouterEnv) => env.locale),
          ),
          RM.bind('response', args => RM.of(authenticateError(args))),
          RM.ichainW(handleResponse),
        ),
      ),
    ),
    pipe(
      usersDataMatch.parser,
      P.map(() =>
        pipe(
          RM.decodeHeader('Authorization', input => (typeof input === 'string' ? E.right(input) : E.right(''))),
          RM.chainReaderTaskEitherK(usersData),
          RM.ichainFirst(() => RM.status(StatusCodes.OK)),
          RM.ichainFirst(() => RM.contentType('application/json')),
          RM.ichainFirst(() => RM.closeHeaders()),
          RM.ichainW(RM.send),
          RM.orElseW(error =>
            match(error)
              .with('unavailable', () =>
                pipe(RM.status(StatusCodes.ServiceUnavailable), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)),
              )
              .with('forbidden', () =>
                pipe(RM.status(StatusCodes.Forbidden), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)),
              )
              .exhaustive(),
          ),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getUsers: withEnv(
            () =>
              pipe(
                RTE.Do,
                RTE.apS('users', getUsersFromLegacyPrereview()),
                RTE.apSW('careerStages', Keyv.getAllCareerStages),
                RTE.apSW('locations', Keyv.getAllLocations),
                RTE.map(({ users, careerStages, locations }) =>
                  pipe(
                    users,
                    Array.map(user => ({
                      ...user,
                      careerStage: careerStages[user.orcid]?.value,
                      location: locations[user.orcid]?.value,
                    })),
                  ),
                ),
              ),
            env,
          ),
        })),
      ),
    ),
    pipe(
      reviewsDataMatch.parser,
      P.map(() =>
        pipe(
          RM.decodeHeader('Authorization', input => (typeof input === 'string' ? E.right(input) : E.right(''))),
          RM.chainReaderTaskEitherK(reviewsData),
          RM.ichainFirst(() => RM.status(StatusCodes.OK)),
          RM.ichainFirst(() => RM.contentType('application/json')),
          RM.ichainFirst(() => RM.closeHeaders()),
          RM.ichainW(RM.send),
          RM.orElseW(error =>
            match(error)
              .with('unavailable', () =>
                pipe(RM.status(StatusCodes.ServiceUnavailable), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)),
              )
              .with('forbidden', () =>
                pipe(RM.status(StatusCodes.Forbidden), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)),
              )
              .exhaustive(),
          ),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getPrereviews: withEnv(() => getPrereviewsForSciety, env),
        })),
      ),
    ),
    pipe(
      scietyListMatch.parser,
      P.map(() =>
        pipe(
          RM.decodeHeader('Authorization', input => (typeof input === 'string' ? E.right(input) : E.right(''))),
          RM.chainReaderTaskEitherK(scietyList),
          RM.ichainFirst(() => RM.status(StatusCodes.OK)),
          RM.ichainFirst(() => RM.contentType('application/json')),
          RM.ichainFirst(() => RM.closeHeaders()),
          RM.ichainW(RM.send),
          RM.orElseW(error =>
            match(error)
              .with('unavailable', () =>
                pipe(RM.status(StatusCodes.ServiceUnavailable), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)),
              )
              .with('forbidden', () =>
                pipe(RM.status(StatusCodes.Forbidden), RM.ichain(RM.closeHeaders), RM.ichain(RM.end)),
              )
              .exhaustive(),
          ),
        ),
      ),
      P.map(
        R.local((env: RouterEnv) => ({
          ...env,
          getPrereviews: withEnv(() => getPrereviewsForSciety, env),
        })),
      ),
    ),
  ],
  concatAll(P.getParserMonoid()),
)

export const routes = pipe(route(router, Function.constant(new httpErrors.NotFound())), RM.fromMiddleware, RM.iflatten)
