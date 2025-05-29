import { pipe } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import type * as T from 'fp-ts/lib/Task.js'
import * as EffectToFpts from '../../EffectToFpts.js'
import { withEnv } from '../../Fpts.js'
import * as Keyv from '../../keyv.js'
import { requestReview } from '../../request-review-flow/index.js'
import * as Routes from '../../routes.js'
import type * as Response from '../Response.js'
import type { Env } from './index.js'

const routes: Array<P.Parser<(env: Env) => T.Task<Response.Response>>> = [
  pipe(
    Routes.requestReviewMatch.parser,
    P.map(
      ({ id }) =>
        (env: Env) =>
          requestReview({ locale: env.locale, preprint: id, user: env.loggedInUser })({
            getPreprintTitle: EffectToFpts.toTaskEitherK(env.preprints.getPreprintTitle, env.runtime),
            getReviewRequest: (orcid, preprint) =>
              withEnv(Keyv.getReviewRequest, {
                reviewRequestStore: env.reviewRequestStore,
                ...env.logger,
              })([orcid, preprint]),
          }),
    ),
  ),
]

export const RequestReviewFlowRouter = pipe(routes, concatAll(P.getParserMonoid())) satisfies P.Parser<
  (env: Env) => T.Task<Response.Response>
>
