import { Effect, flow, pipe } from 'effect'
import * as P from 'fp-ts-routing'
import { concatAll } from 'fp-ts/lib/Monoid.js'
import type * as T from 'fp-ts/lib/Task.js'
import { authorInvite } from '../../author-invite-flow/index.js'
import * as EffectToFpts from '../../EffectToFpts.js'
import { withEnv } from '../../Fpts.js'
import * as Keyv from '../../keyv.js'
import * as Routes from '../../routes.js'
import type * as Response from '../Response.js'
import type { Env } from './index.js'

export const AuthorInviteFlowRouter = pipe(
  [
    pipe(
      Routes.authorInviteMatch.parser,
      P.map(
        ({ id }) =>
          (env: Env) =>
            authorInvite({ id, locale: env.locale, user: env.loggedInUser })({
              getPrereview: EffectToFpts.toTaskEitherK(
                flow(
                  env.prereviews.getPrereview,
                  Effect.catchTag('PrereviewIsNotFound', 'PrereviewIsUnavailable', 'PrereviewWasRemoved', () =>
                    Effect.fail('unavailable' as const),
                  ),
                ),
                env.runtime,
              ),
              getAuthorInvite: withEnv(Keyv.getAuthorInvite, {
                authorInviteStore: env.authorInviteStore,
                ...env.logger,
              }),
            }),
      ),
    ),
  ],
  concatAll(P.getParserMonoid()),
) satisfies P.Parser<(env: Env) => T.Task<Response.Response>>
