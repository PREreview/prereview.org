import { HttpServerResponse } from 'effect/http'
import { Array, Effect, flow, Option, pipe, Record, Redacted } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import type * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { Clubs } from '../../../Clubs/index.ts'
import { ZenodoRecords } from '../../../ExternalInteractions/index.ts'
import { withEnv } from '../../../Fpts.ts'
import * as OrcidTokens from '../../../OrcidTokens.ts'
import * as Prereviewers from '../../../Prereviewers/index.ts'
import { EffectToFpts, FptsToEffect } from '../../../RefactoringUtilities/index.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { reviewsData, type GetPrereviewsEnv } from '../../reviews-data/index.ts'
import { scietyList, type ScietyListEnv } from '../../sciety-list/index.ts'
import { usersData, type GetUsersEnv } from '../../users-data/index.ts'
import type { Env } from './index.ts'

export const DataRouter = pipe(
  [
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
    Effect.fnUntraced(
      function* (env: Env) {
        const json = yield* FptsToEffect.readerTaskEither(handler(env.authorizationHeader ?? ''), {
          scietyListToken: Redacted.value(env.scietyListToken),
          getPrereviews: withEnv(() => ZenodoRecords.getPrereviewsForSciety, {
            fetch: env.fetch,
            getClubByName: EffectToFpts.toTaskK(
              flow(
                getClubByName,
                Effect.map(Option.some),
                Effect.catchTag('ClubNotFound', () => Effect.succeedNone),
              ),
              env.runtime,
            ),
            runtime: env.runtime,
            zenodoApiKey: Redacted.value(env.zenodoApiConfig.key),
            zenodoUrl: env.zenodoApiConfig.origin,
            ...env.logger,
          }),
          getUsers: () =>
            EffectToFpts.toTaskEither(
              pipe(
                Effect.all(
                  {
                    users: Prereviewers.listAllPrereviewersForStats(),
                    careerStages: Prereviewers.CareerStages.getAll(),
                    locations: Prereviewers.Locations.getAll(),
                    orcidTokens: OrcidTokens.getAll(),
                  },
                  { concurrency: 'unbounded' },
                ),
                Effect.map(({ users, careerStages, locations, orcidTokens }) =>
                  Array.map(users, user => ({
                    orcid: user.orcidId,
                    timestamp: user.registeredAt,
                    requestNotifications: user.requestNotifications,
                    orcidRecordConnected: Record.has(orcidTokens, user.orcidId),
                    careerStage: careerStages[user.orcidId]?.value,
                    location: locations[user.orcidId]?.value,
                  })),
                ),
                Effect.catchTag('UnableToQuery', () => Effect.fail('unavailable' as const)),
              ),
              env.runtime,
            ),
        })

        return HttpServerResponse.raw(json, { status: StatusCodes.OK, contentType: 'application/json' })
      },
      Effect.catchIf(
        (error): error is 'unavailable' => error === 'unavailable',
        () => Effect.succeed(HttpServerResponse.empty({ status: StatusCodes.ServiceUnavailable })),
      ),
      Effect.catchIf(
        // oxlint-disable-next-line typescript/no-unnecessary-condition
        (error): error is 'forbidden' => error === 'forbidden',
        () => Effect.succeed(HttpServerResponse.empty({ status: StatusCodes.Forbidden })),
      ),
    ),
  ),
) as P.Parser<
  (
    env: Env,
  ) => Effect.Effect<HttpServerResponse.HttpServerResponse, never, EffectToFpts.ContextServices<Env['runtime']>>
>

const getClubByName = (...args: Parameters<(typeof Clubs.Service)['getClubByName']>) =>
  Clubs.use(service => service.getClubByName(...args))
