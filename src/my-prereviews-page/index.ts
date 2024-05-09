import * as RT from 'fp-ts/ReaderTask'
import * as RTE from 'fp-ts/ReaderTaskEither'
import { identity, pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import type { Response } from '../response'
import type { User } from '../user'
import * as ListOfPrereviews from './list-of-prereviews'
import * as NoPrereviews from './no-prereviews'
import * as Prereviews from './prereviews'
import * as RequireLogIn from './require-log-in'
import * as UnableToLoadPrereviews from './unable-to-load-prereviews'

export const myPrereviews = ({ user }: { user?: User }): RT.ReaderTask<Prereviews.GetMyPrereviewsEnv, Response> =>
  pipe(
    RTE.fromEither(RequireLogIn.ensureUserIsLoggedIn(user)),
    RTE.chainW(Prereviews.getMyPrereviews),
    RTE.chainEitherKW(NoPrereviews.ensureThereArePrereviews),
    RTE.matchW(identity, ListOfPrereviews.ListOfPrereviews),
    RT.map(result =>
      match(result)
        .with({ _tag: 'ListOfPrereviews' }, ListOfPrereviews.toResponse)
        .with({ _tag: 'NoPrereviews' }, NoPrereviews.toResponse)
        .with({ _tag: 'RequireLogIn' }, RequireLogIn.toResponse)
        .with({ _tag: 'UnableToLoadPrereviews' }, UnableToLoadPrereviews.toResponse)
        .exhaustive(),
    ),
  )
