import * as R from 'fp-ts/Reader'
import type { User } from './user'

export interface CanRapidReviewEnv {
  canRapidReview: (user: User) => boolean
}

export const canRapidReview = (user: User) => R.asks(({ canRapidReview }: CanRapidReviewEnv) => canRapidReview(user))
