import { HttpServerResponse } from '@effect/platform'
import { Array, Effect, pipe, Redacted } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { ZenodoRecords } from '../../../ExternalInteractions/index.ts'
import { withEnv } from '../../../Fpts.ts'
import * as Keyv from '../../../keyv.ts'
import * as Preprints from '../../../Preprints/index.ts'
import * as Prereviewers from '../../../Prereviewers/index.ts'
import { EffectToFpts, FptsToEffect } from '../../../RefactoringUtilities/index.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
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
          getPrereviews: withEnv(() => ZenodoRecords.getPrereviewsForSciety, {
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
                RTE.apS(
                  'users',
                  EffectToFpts.toReaderTaskEither(
                    Effect.catchTag(Prereviewers.listAllPrereviewersForStats(), 'UnableToQuery', () =>
                      Effect.fail('unavailable' as const),
                    ),
                  ),
                ),
                RTE.apSW('careerStages', Keyv.getAllCareerStages),
                RTE.apSW('locations', Keyv.getAllLocations),
                RTE.map(({ users, careerStages, locations }) =>
                  pipe(
                    users,
                    Array.map(user => ({
                      orcid: user.orcidId,
                      timestamp: user.registeredAt,
                      careerStage: careerStages[user.orcidId]?.value,
                      location: locations[user.orcidId]?.value,
                    })),
                  ),
                ),
              ),
            {
              careerStageStore: env.users.careerStageStore,
              locationStore: env.users.locationStore,
              runtime: env.runtime,
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
