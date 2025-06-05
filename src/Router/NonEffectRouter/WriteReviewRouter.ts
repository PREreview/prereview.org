import { pipe } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import type * as T from 'fp-ts/lib/Task.js'
import * as EffectToFpts from '../../EffectToFpts.js'
import * as Preprints from '../../Preprints/index.js'
import * as Routes from '../../routes.js'
import { writeReview } from '../../write-review/index.js'
import type * as Response from '../Response.js'
import type { Env } from './index.js'

const routes: Array<P.Parser<(env: Env) => T.Task<Response.Response>>> = [
  pipe(
    Routes.writeReviewMatch.parser,
    P.map(
      ({ id }) =>
        (env: Env) =>
          writeReview({ id, locale: env.locale, user: env.loggedInUser })({
            formStore: env.formStore,
            getPreprint: EffectToFpts.toTaskEitherK(Preprints.getPreprint, env.runtime),
          }),
    ),
  ),
]

export const WriteReviewRouter = pipe(routes, concatAll(P.getParserMonoid())) satisfies P.Parser<
  (env: Env) => T.Task<Response.Response>
>
