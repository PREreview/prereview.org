import { HttpServerResponse } from '@effect/platform'
import { Array, Effect, pipe, Redacted } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { withEnv } from '../../../Fpts.ts'
import * as Keyv from '../../../keyv.ts'
import * as LegacyPrereview from '../../../legacy-prereview.ts'
import * as Preprints from '../../../Preprints/index.ts'
import { EffectToFpts, FptsToEffect } from '../../../RefactoringUtilities/index.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import * as Zenodo from '../../../zenodo.ts'
import { clubsData } from '../../clubs-data/index.ts'
import { reviewsData, type GetPrereviewsEnv } from '../../reviews-data/index.ts'
import { scietyList, type ScietyListEnv } from '../../sciety-list/index.ts'
import { usersData, type GetUsersEnv } from '../../users-data/index.ts'
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
    pipe(
      Routes.reviewsDataMatch.parser,
      P.map(() => reviewsData),
    ),
    pipe(
      Routes.scietyListMatch.parser,
      P.map(() => scietyList),
    ),
  ],
  concatAll(
    P.getParserMonoid<
      (
        authorizationHeader: string,
      ) => RTE.ReaderTaskEither<ScietyListEnv & GetPrereviewsEnv & GetUsersEnv, 'forbidden' | 'unavailable', string>
    >(),
  ),
  P.map(handler =>
    Effect.fn(
      function* (env: Env) {
        const json = yield* FptsToEffect.readerTaskEither(handler(env.authorizationHeader ?? ''), {
          scietyListToken: Redacted.value(env.scietyListToken),
          getPrereviews: withEnv(() => Zenodo.getPrereviewsForSciety, {
            fetch: env.fetch,
            getPreprintId: EffectToFpts.toTaskEitherK(Preprints.getPreprintId, env.runtime),
            zenodoApiKey: Redacted.value(env.zenodoApiConfig.key),
            zenodoUrl: env.zenodoApiConfig.origin,
            ...env.logger,
          }),
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
