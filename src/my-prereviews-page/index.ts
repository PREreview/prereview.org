import { flow, identity, pipe } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { get } from 'spectacles-ts'
import { match } from 'ts-pattern'
import type { Response } from '../response.js'
import type { User } from '../user.js'
import * as ListOfPrereviews from './list-of-prereviews.js'
import * as NoPrereviews from './no-prereviews.js'
import * as Prereviews from './prereviews.js'
import * as RequireLogIn from './require-log-in.js'
import * as UnableToLoadPrereviews from './unable-to-load-prereviews.js'

export const myPrereviews = ({ user }: { user?: User }): RT.ReaderTask<Prereviews.GetMyPrereviewsEnv, Response> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromEither(RequireLogIn.ensureUserIsLoggedIn(user))),
    RTE.bindW(
      'prereviews',
      flow(get('user'), Prereviews.getMyPrereviews, RTE.chainEitherKW(NoPrereviews.ensureThereArePrereviews)),
    ),
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
