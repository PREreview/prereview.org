import { Effect, Function, pipe } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import type * as T from 'fp-ts/lib/Task.js'
import { withEnv } from '../../../Fpts.ts'
import * as Keyv from '../../../keyv.ts'
import * as Preprints from '../../../Preprints/index.ts'
import * as PrereviewCoarNotify from '../../../prereview-coar-notify/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import type * as Response from '../../../Response/index.ts'
import type { ReviewRequestPreprintId } from '../../../review-request.ts'
import * as Routes from '../../../routes.ts'
import type { User } from '../../../user.ts'
import {
  requestReview,
  requestReviewCheck,
  requestReviewPersona,
  requestReviewPublished,
  requestReviewStart,
} from '../../request-review-flow/index.ts'
import type { Env } from './index.ts'

export const RequestReviewFlowRouter = pipe(
  [
    pipe(
      Routes.requestReviewMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            requestReview({ locale: env.locale, preprint: id, user: env.loggedInUser }),
      ),
    ),
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
        getPreprintTitle: EffectToFpts.toTaskEitherK(Preprints.getPreprintTitle, env.runtime),
        getReviewRequest: (orcid, preprint) =>
          withEnv(Keyv.getReviewRequest, { reviewRequestStore: env.reviewRequestStore, ...env.logger })([
            orcid,
            preprint,
          ]),
        publishRequest: withEnv(
          EffectToFpts.toReaderTaskEitherK(
            (preprint: ReviewRequestPreprintId, user: User, persona: 'public' | 'pseudonym') =>
              pipe(
                PrereviewCoarNotify.publishReviewRequest,
                Function.apply(preprint, user, persona),
                Effect.tapError(error =>
                  Effect.logError('Failed to publishRequest (COAR)').pipe(Effect.annotateLogs({ error })),
                ),
                Effect.mapError(() => 'unavailable' as const),
              ),
          ),
          { runtime: env.runtime },
        ),
        saveReviewRequest: (orcid, preprint, request) =>
          withEnv(Keyv.saveReviewRequest, { reviewRequestStore: env.reviewRequestStore, ...env.logger })(
            [orcid, preprint],
            request,
          ),
      }),
  ),
) satisfies P.Parser<(env: Env) => T.Task<Response.Response>>
