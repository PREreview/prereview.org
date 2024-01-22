import * as R from 'fp-ts/Reader'
import type { User } from './user'

export interface CanInviteAuthorsEnv {
  canInviteAuthors: (user: User) => boolean
}

export const canInviteAuthors = (user: User) =>
  R.asks(({ canInviteAuthors }: CanInviteAuthorsEnv) => canInviteAuthors(user))

export interface RequiresVerifiedEmailAddressEnv {
  requiresVerifiedEmailAddress: (user: User) => boolean
}

export const requiresVerifiedEmailAddress = (user: User) =>
  R.asks(({ requiresVerifiedEmailAddress }: RequiresVerifiedEmailAddressEnv) => requiresVerifiedEmailAddress(user))
