import * as R from 'fp-ts/Reader'
import type { User } from './user'

export interface CanSeeClubsEnv {
  canSeeClubs: boolean
}

export interface CanRapidReviewEnv {
  canRapidReview: (user: User) => boolean
}

export const canSeeClubs = R.asks(({ canSeeClubs }: CanSeeClubsEnv) => canSeeClubs)

export const canRapidReview = (user: User) => R.asks(({ canRapidReview }: CanRapidReviewEnv) => canRapidReview(user))
