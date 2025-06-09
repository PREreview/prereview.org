import { pipe } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import type * as T from 'fp-ts/lib/Task.js'
import * as EffectToFpts from '../../EffectToFpts.js'
import { withEnv } from '../../Fpts.js'
import * as Keyv from '../../keyv.js'
import * as Preprints from '../../Preprints/index.js'
import { requestReview } from '../../request-review-flow/index.js'
import * as Routes from '../../routes.js'
import type * as Response from '../Response.js'
import type { Env } from './index.js'

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
      }),
  ),
) satisfies P.Parser<(env: Env) => T.Task<Response.Response>>
