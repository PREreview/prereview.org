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
import { withEnv } from './Fpts.js'
import * as StatusCodes from './StatusCodes.js'
import * as Keyv from './keyv.js'
import {
  createUserOnLegacyPrereview,
  getPseudonymFromLegacyPrereview,
  getUsersFromLegacyPrereview,
  type LegacyPrereviewApiEnv,
} from './legacy-prereview.js'
import type { SupportedLocale } from './locales/index.js'
import {
  authenticate,
  authenticateError,
  logIn,
  logOut,
  type IsUserBlockedEnv,
  type OrcidOAuthEnv,
} from './log-in/index.js'
import type { TemplatePageEnv } from './page.js'
import type { GetPreprintIdEnv } from './preprint.js'
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
import { scietyList, type ScietyListEnv } from './sciety-list/index.js'
import type { OrcidId } from './types/OrcidId.js'
import type { GetUserOnboardingEnv } from './user-onboarding.js'
import type { User } from './user.js'
import { usersData } from './users-data/index.js'
import { getPrereviewsForSciety } from './zenodo.js'

export type RouterEnv = GetPreprintIdEnv &
  GetUserOnboardingEnv &
  Keyv.CareerStageStoreEnv &
  IsUserBlockedEnv &
  LegacyPrereviewApiEnv &
  Keyv.LocationStoreEnv & { locale: SupportedLocale; user?: User } & L.LoggerEnv &
  OrcidOAuthEnv &
  PublicUrlEnv &
  ScietyListEnv &
  SessionEnv &
  TemplatePageEnv &
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
            (user: { orcid: OrcidId; name: string }) =>
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
