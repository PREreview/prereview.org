import { HttpServerResponse } from '@effect/platform'
import { Array, Effect, pipe, Redacted } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { clubsData } from '../../clubs-data/index.ts'
import { withEnv } from '../../Fpts.ts'
import * as FptsToEffect from '../../FptsToEffect.ts'
import * as Keyv from '../../keyv.ts'
import * as LegacyPrereview from '../../legacy-prereview.ts'
import * as Routes from '../../routes.ts'
import * as StatusCodes from '../../StatusCodes.ts'
import { usersData } from '../../users-data/index.ts'
import type { Env } from './index.ts'

export const DataRouter = pipe(
  [
    pipe(
      Routes.clubsDataMatch.parser,
      P.map(() => clubsData),
    ),
    pipe(
      Routes.usersDataMatch.parser,
      P.map(() => usersData),
    ),
  ],
  concatAll(P.getParserMonoid()),
  P.map(handler =>
    Effect.fn(
      function* (env: Env) {
        const json = yield* FptsToEffect.readerTaskEither(handler(env.authorizationHeader ?? ''), {
          scietyListToken: Redacted.value(env.scietyListToken),
          getUsers: withEnv(
            () =>
              pipe(
                RTE.Do,
                RTE.apS('users', LegacyPrereview.getUsersFromLegacyPrereview()),
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
            {
              careerStageStore: env.users.careerStageStore,
              fetch: env.fetch,
              legacyPrereviewApi: {
                app: env.legacyPrereviewApiConfig.app,
                key: Redacted.value(env.legacyPrereviewApiConfig.key),
                url: env.legacyPrereviewApiConfig.origin,
                update: env.legacyPrereviewApiConfig.update,
              },
              locationStore: env.users.locationStore,
              ...env.logger,
            },
          ),
        })

        return yield* HttpServerResponse.raw(json, { status: StatusCodes.OK, contentType: 'application/json' })
      },
      Effect.catchIf(
        (error): error is 'unavailable' => error === 'unavailable',
        () => HttpServerResponse.empty({ status: StatusCodes.ServiceUnavailable }),
      ),
      Effect.catchIf(
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        (error): error is 'forbidden' => error === 'forbidden',
        () => HttpServerResponse.empty({ status: StatusCodes.Forbidden }),
      ),
    ),
  ),
) as P.Parser<(env: Env) => Effect.Effect<HttpServerResponse.HttpServerResponse>>
