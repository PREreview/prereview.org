import * as E from 'fp-ts/Either'
import { identity, pipe } from 'fp-ts/function'
import { match } from 'ts-pattern'
import type { Response } from '../response'
import type { User } from '../user'
import * as RequireLogIn from './require-log-in'
import * as UnableToLoadPrereviews from './unable-to-load-prereviews'

export const myPrereviews = ({ user }: { user?: User }): Response =>
  pipe(
    E.Do,
    E.apS('user', RequireLogIn.ensureUserIsLoggedIn(user)),
    E.foldW(identity, () => UnableToLoadPrereviews.UnableToLoadPrereviews),
    result =>
      match(result)
        .with({ _tag: 'RequireLogIn' }, RequireLogIn.toResponse)
        .with({ _tag: 'UnableToLoadPrereviews' }, UnableToLoadPrereviews.toResponse)
        .exhaustive(),
  )
