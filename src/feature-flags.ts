import * as R from 'fp-ts/Reader'
import type { User } from './user'

export interface CanChangeContactEmailAddressEnv {
  canChangeContactEmailAddress: (user: User) => boolean
}

export const canChangeContactEmailAddress = (user: User) =>
  R.asks(({ canChangeContactEmailAddress }: CanChangeContactEmailAddressEnv) => canChangeContactEmailAddress(user))
