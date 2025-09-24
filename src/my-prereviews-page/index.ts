import { flow, identity, Match, pipe, Struct } from 'effect'
import * as RT from 'fp-ts/lib/ReaderTask.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type { SupportedLocale } from '../locales/index.ts'
import type { Response } from '../response.ts'
import type { User } from '../user.ts'
import * as ListOfPrereviews from './list-of-prereviews.ts'
import * as NoPrereviews from './no-prereviews.ts'
import * as Prereviews from './prereviews.ts'
import * as RequireLogIn from './require-log-in.ts'
import * as UnableToLoadPrereviews from './unable-to-load-prereviews.ts'

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
    RT.map(
      Match.valueTags({
        ListOfPrereviews: result => ListOfPrereviews.toResponse(result, locale),
        NoPrereviews: result => NoPrereviews.toResponse(result, locale),
        RequireLogIn: RequireLogIn.toResponse,
        UnableToLoadPrereviews: result => UnableToLoadPrereviews.toResponse(result, locale),
      }),
    ),
  )
