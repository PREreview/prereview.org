import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/lib/Either.js'
import * as Response from '../Response/index.ts'
import { myPrereviewsMatch } from '../routes.ts'
import type { User } from '../user.ts'

export interface RequireLogIn {
  readonly _tag: 'RequireLogIn'
}

export const RequireLogIn: RequireLogIn = {
  _tag: 'RequireLogIn',
}

export const ensureUserIsLoggedIn: (user: User | undefined) => E.Either<RequireLogIn, User> =
  E.fromNullable(RequireLogIn)

export const toResponse: (requireLogIn: RequireLogIn) => Response.Response = () =>
  Response.LogInResponse({ location: format(myPrereviewsMatch.formatter, {}) })
