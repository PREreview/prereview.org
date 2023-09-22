import * as R from 'fp-ts/Reader'
import type { User } from './user'

export interface CanConnectSlackEnv {
  canConnectSlack: (user: User) => boolean
}

export const canConnectSlack = (user: User) =>
  R.asks(({ canConnectSlack }: CanConnectSlackEnv) => canConnectSlack(user))
