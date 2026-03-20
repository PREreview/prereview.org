import { Effect, pipe } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import type * as T from 'fp-ts/lib/Task.js'
import { withEnv } from '../../../Fpts.ts'
import * as Keyv from '../../../keyv.ts'
import * as Preprints from '../../../Preprints/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import * as ReviewRequests from '../../../ReviewRequests/index.ts'
import * as Routes from '../../../routes.ts'
import { Temporal, Uuid } from '../../../types/index.ts'
import {
  requestReviewCheck,
  requestReviewPersona,
  requestReviewPublished,
  requestReviewStart,
} from '../../request-review-flow/index.ts'
import type * as Response from '../../Response/index.ts'
import type { Env } from './index.ts'

export const RequestReviewFlowRouter = pipe(
  [
    pipe(
      Routes.requestReviewStartMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            requestReviewStart({ locale: env.locale, preprint: id, user: env.loggedInUser }),
      ),
    ),
    pipe(
      Routes.requestReviewPersonaMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            requestReviewPersona({
              body: env.body,
              locale: env.locale,
              method: env.method,
              preprint: id,
              user: env.loggedInUser,
            }),
      ),
    ),
    pipe(
      Routes.requestReviewCheckMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            requestReviewCheck({ locale: env.locale, method: env.method, preprint: id, user: env.loggedInUser }),
      ),
    ),
    pipe(
      Routes.requestReviewPublishedMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            requestReviewPublished({ locale: env.locale, preprint: id, user: env.loggedInUser }),
      ),
    ),
  ],
  concatAll(P.getParserMonoid()),
  P.map(
    handler => (env: Env) =>
      handler(env)({
        generateUuid: EffectToFpts.toIO(Uuid.v4(), env.runtime),
        getPreprintTitle: EffectToFpts.toTaskEitherK(Preprints.getPreprintTitle, env.runtime),
        getReviewRequest: (orcid, preprint) =>
          withEnv(Keyv.getReviewRequest, { reviewRequestStore: env.reviewRequestStore, ...env.logger })([
            orcid,
            preprint,
          ]),
        publishRequest: withEnv(
          EffectToFpts.toReaderTaskEitherK((reviewRequestId: Uuid.Uuid) =>
            pipe(
              Effect.gen(function* () {
                const publishedAt = yield* Temporal.currentInstant

                yield* ReviewRequests.publishReviewRequest({
                  publishedAt,
                  reviewRequestId,
                })
              }),
              Effect.tapError(error =>
                Effect.logError('Failed to publishRequest').pipe(Effect.annotateLogs({ error })),
              ),
              Effect.mapError(() => 'unavailable' as const),
              Effect.scoped,
            ),
          ),
          { runtime: env.runtime },
        ),
        runtime: env.runtime,
        saveReviewRequest: (orcid, preprint, request) =>
          withEnv(Keyv.saveReviewRequest, { reviewRequestStore: env.reviewRequestStore, ...env.logger })(
            [orcid, preprint],
            request,
          ),
      }),
  ),
) satisfies P.Parser<(env: Env) => T.Task<Response.Response>>
