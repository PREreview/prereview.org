import * as R from 'fp-ts/Reader'

export interface CanSeeClubsEnv {
  canSeeClubs: boolean
}

export const canSeeClubs = R.asks(({ canSeeClubs }: CanSeeClubsEnv) => canSeeClubs)
