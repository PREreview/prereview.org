import { pipe } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import type * as T from 'fp-ts/lib/Task.js'
import * as Preprints from '../../../Preprints/index.ts'
import { EffectToFpts } from '../../../RefactoringUtilities/index.ts'
import * as Routes from '../../../routes.ts'
import { requestReviewCheck, requestReviewCheckSubmission } from '../../request-review-flow/index.ts'
import type * as Response from '../../Response/index.ts'
import type { Env } from './index.ts'

export const RequestReviewFlowRouter = pipe(
  [
    pipe(
      Routes.requestReviewCheckMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            env.method === 'POST'
              ? requestReviewCheckSubmission({
                  locale: env.locale,
                  preprint: id,
                  user: env.loggedInUser,
                })
              : requestReviewCheck({ locale: env.locale, preprint: id, user: env.loggedInUser }),
      ),
    ),
  ],
  concatAll(P.getParserMonoid()),
  P.map(
    handler => (env: Env) =>
      handler(env)({
        getPreprintTitle: EffectToFpts.toTaskEitherK(Preprints.getPreprintTitle, env.runtime),
        runtime: env.runtime,
      }),
  ),
) satisfies P.Parser<(env: Env) => T.Task<Response.Response>>
