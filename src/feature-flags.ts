import * as R from 'fp-ts/Reader'

export interface CanSeeClubsEnv {
  canSeeClubs: boolean
}

export interface CanEditProfileEnv {
  canEditProfile: boolean
}

export const canSeeClubs = R.asks(({ canSeeClubs }: CanSeeClubsEnv) => canSeeClubs)

export const canEditProfile = R.asks(({ canEditProfile }: CanEditProfileEnv) => canEditProfile)
