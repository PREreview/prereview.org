import * as R from 'fp-ts/Reader'
import type { User } from './user'

export interface CanConnectSlackEnv {
  canConnectSlack: (user: User) => boolean
}

export interface CanChangeContactEmailAddressEnv {
  canChangeContactEmailAddress: boolean
}

export const canConnectSlack = (user: User) =>
  R.asks(({ canConnectSlack }: CanConnectSlackEnv) => canConnectSlack(user))

export const canChangeContactEmailAddress = R.asks(
  ({ canChangeContactEmailAddress }: CanChangeContactEmailAddressEnv) => canChangeContactEmailAddress,
)
