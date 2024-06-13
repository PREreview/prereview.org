import { format } from 'fp-ts-routing'
import * as E from 'fp-ts/Either'
import * as Response from '../response.js'
import { myPrereviewsMatch } from '../routes.js'
import type { User } from '../user.js'

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
