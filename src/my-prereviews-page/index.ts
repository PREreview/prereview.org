import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { identity, pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import type { Response } from '../response'
import type { User } from '../user'
import * as Prereviews from './prereviews'
import * as RequireLogIn from './require-log-in'
import * as UnableToLoadPrereviews from './unable-to-load-prereviews'

export const myPrereviews = ({ user }: { user?: User }): RT.ReaderTask<Prereviews.GetMyPrereviewsEnv, Response> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromEither(RequireLogIn.ensureUserIsLoggedIn(user))),
    RTE.bindW('prereviews', ({ user }) => Prereviews.getMyPrereviews(user)),
    RTE.matchW(identity, () => UnableToLoadPrereviews.UnableToLoadPrereviews),
    RT.map(result =>
      match(result)
        .with({ _tag: 'RequireLogIn' }, RequireLogIn.toResponse)
        .with({ _tag: 'UnableToLoadPrereviews' }, UnableToLoadPrereviews.toResponse)
        .exhaustive(),
    ),
  )
