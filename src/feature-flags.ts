import * as R from 'fp-ts/Reader'
import type { User } from './user'

export interface RequiresVerifiedEmailAddressEnv {
  requiresVerifiedEmailAddress: (user: User) => boolean
}

export const requiresVerifiedEmailAddress = (user: User) =>
  R.asks(({ requiresVerifiedEmailAddress }: RequiresVerifiedEmailAddressEnv) => requiresVerifiedEmailAddress(user))
