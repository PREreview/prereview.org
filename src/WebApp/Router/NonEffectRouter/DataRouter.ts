import { Array, Effect, Match, pipe, Record, Redacted } from 'effect'
import { HttpServerResponse } from 'effect/http'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import type * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import {
  PreprintReviews,
  type PublishedPreprintReviewForReviewsData,
  type PublishedPreprintReviewForSciety,
} from '../../../Domain/PreprintReviews/index.ts'
import * as Prereviewers from '../../../Domain/Prereviewers/index.ts'
import * as OrcidTokens from '../../../OrcidTokens.ts'
import { EffectToFpts, FptsToEffect } from '../../../RefactoringUtilities/index.ts'
import * as Routes from '../../../routes.ts'
import * as StatusCodes from '../../../StatusCodes.ts'
import { Temporal } from '../../../types/index.ts'
import { getTopicDomain, getTopicField, getTopicSubfield } from '../../../types/Topic.ts'
import { reviewsData, type GetPrereviewsEnv, type Prereview as ReviewsDataPrereview } from '../../reviews-data/index.ts'
import {
  scietyList,
  type GetPrereviewsForScietyEnv,
  type ScietyListEnv,
  type Prereview as ScietyListPrereview,
} from '../../sciety-list/index.ts'
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
      ) => RTE.ReaderTaskEither<
        ScietyListEnv & GetPrereviewsEnv & GetPrereviewsForScietyEnv & GetUsersEnv,
        'forbidden' | 'unavailable',
        string
      >
    >(),
  ),
  P.map(handler =>
    Effect.fnUntraced(
      function* (env: Env) {
        const json = yield* FptsToEffect.readerTaskEither(handler(env.authorizationHeader ?? ''), {
          scietyListToken: Redacted.value(env.scietyListToken),
          getPrereviews: () =>
            EffectToFpts.toTaskEither(
              pipe(
                PreprintReviews.getAllPublishedPreprintReviewsForReviewsData,
                Effect.map(Array.map(toReviewsDataPrereview)),
                Effect.catchTag('PrereviewsAreUnavailable', () => Effect.fail('unavailable' as const)),
              ),
              env.runtime,
            ),
          getPrereviewsForSciety: () =>
            EffectToFpts.toTaskEither(
              pipe(
                PreprintReviews.getAllPublishedPreprintReviewsForSciety,
                Effect.map(Array.map(toScietyListPrereview)),
                Effect.catchTag('PrereviewsAreUnavailable', () => Effect.fail('unavailable' as const)),
              ),
              env.runtime,
            ),
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
                Effect.mapError(() => 'unavailable' as const),
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

const toReviewsDataPrereview = (prereview: PublishedPreprintReviewForReviewsData): ReviewsDataPrereview => ({
  preprint: prereview.preprint,
  createdAt:
    prereview.published instanceof Temporal.Instant
      ? prereview.published.toZonedDateTimeISO('UTC').toPlainDate()
      : prereview.published,
  doi: prereview.doi,
  authors: Array.map(
    prereview.authors,
    Match.valueTags({
      Public: author => ({ orcid: author.orcidId }),
      Pseudonym: author => ({ pseudonym: author.pseudonym }),
    }),
  ),
  language: prereview.language,
  type: prereview.structured ? 'structured' : 'full',
  club: prereview.club,
  live: prereview.live,
  requested: prereview.requested,
  domains: Array.dedupe(Array.map(prereview.topics, getTopicDomain)),
  fields: Array.dedupe(Array.map(prereview.topics, getTopicField)),
  subfields: Array.dedupe(Array.map(prereview.topics, getTopicSubfield)),
})

const toScietyListPrereview = (prereview: PublishedPreprintReviewForSciety): ScietyListPrereview => ({
  preprint: prereview.preprint,
  createdAt:
    prereview.published instanceof Temporal.Instant
      ? prereview.published.toZonedDateTimeISO('UTC').toPlainDate()
      : prereview.published,
  doi: prereview.doi,
  authors: Array.map(
    prereview.authors,
    Prereviewers.matchPersona({
      onPublic: persona => ({ name: persona.displayName }),
      onPseudonym: persona => ({ name: persona.pseudonym }),
    }),
  ),
})
