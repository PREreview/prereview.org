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

export const WriteReviewRouter = pipe(
  [
    pipe(
      Routes.writeReviewMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            writeReview({ id, locale: env.locale, user: env.loggedInUser }),
      ),
    ),
  ],
  concatAll(P.getParserMonoid()),
  P.map(
    handler => (env: Env) =>
      handler(env)({
        formStore: env.formStore,
        getPreprint: EffectToFpts.toTaskEitherK(Preprints.getPreprint, env.runtime),
      }),
  ),
) satisfies P.Parser<(env: Env) => T.Task<Response.Response>>
