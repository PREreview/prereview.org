import * as R from 'fp-ts/Reader'
import type { User } from './user'

export interface CanConnectSlackEnv {
  canConnectSlack: (user: User) => boolean
}

export interface CanChangeContactEmailAddressEnv {
  canChangeContactEmailAddress: (user: User) => boolean
}

export const canConnectSlack = (user: User) =>
  R.asks(({ canConnectSlack }: CanConnectSlackEnv) => canConnectSlack(user))

export const canChangeContactEmailAddress = (user: User) =>
  R.asks(({ canChangeContactEmailAddress }: CanChangeContactEmailAddressEnv) => canChangeContactEmailAddress(user))
