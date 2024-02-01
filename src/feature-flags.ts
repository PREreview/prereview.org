import * as R from 'fp-ts/Reader'
import type { User } from './user'

export interface CanInviteAuthorsEnv {
  canInviteAuthors: (user: User) => boolean
}

export const canInviteAuthors = (user: User) =>
  R.asks(({ canInviteAuthors }: CanInviteAuthorsEnv) => canInviteAuthors(user))

export interface CanConnectOrcidProfileEnv {
  canConnectOrcidProfile: (user: User) => boolean
}

export const canConnectOrcidProfile = (user: User) =>
  R.asks(({ canConnectOrcidProfile }: CanConnectOrcidProfileEnv) => canConnectOrcidProfile(user))
