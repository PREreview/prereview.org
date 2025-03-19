import { flow, identity, pipe, Struct } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import { match } from 'ts-pattern'
import type { SupportedLocale } from '../locales/index.js'
import type { Response } from '../response.js'
import type { User } from '../user.js'
import * as ListOfPrereviews from './list-of-prereviews.js'
import * as NoPrereviews from './no-prereviews.js'
import * as Prereviews from './prereviews.js'
import * as RequireLogIn from './require-log-in.js'
import * as UnableToLoadPrereviews from './unable-to-load-prereviews.js'

export const myPrereviews = ({
  locale,
  user,
}: {
  locale: SupportedLocale
  user?: User
}): RT.ReaderTask<Prereviews.GetMyPrereviewsEnv, Response> =>
  pipe(
    RTE.Do,
    RTE.apS('user', RTE.fromEither(RequireLogIn.ensureUserIsLoggedIn(user))),
    RTE.bindW(
      'prereviews',
      flow(Struct.get('user'), Prereviews.getMyPrereviews, RTE.chainEitherKW(NoPrereviews.ensureThereArePrereviews)),
    ),
    RTE.matchW(identity, ListOfPrereviews.ListOfPrereviews),
    RT.map(result =>
      match(result)
        .with({ _tag: 'ListOfPrereviews' }, result => ListOfPrereviews.toResponse(result, locale))
        .with({ _tag: 'NoPrereviews' }, result => NoPrereviews.toResponse(result, locale))
        .with({ _tag: 'RequireLogIn' }, RequireLogIn.toResponse)
        .with({ _tag: 'UnableToLoadPrereviews' }, result => UnableToLoadPrereviews.toResponse(result, locale))
        .exhaustive(),
    ),
  )
