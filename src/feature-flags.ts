import * as R from 'fp-ts/Reader'
import type { User } from './user'

export interface CanConnectOrcidProfileEnv {
  canConnectOrcidProfile: (user: User) => boolean
}

export const canConnectOrcidProfile = (user: User) =>
  R.asks(({ canConnectOrcidProfile }: CanConnectOrcidProfileEnv) => canConnectOrcidProfile(user))

export interface CanUploadAvatarEnv {
  canUploadAvatar: (user: User) => boolean
}

export const canUploadAvatar = (user: User) =>
  R.asks(({ canUploadAvatar }: CanUploadAvatarEnv) => canUploadAvatar(user))

export interface CanRequestReviewsEnv {
  canRequestReviews: (user?: User) => boolean
}

export const canRequestReviews = (user?: User) =>
  R.asks(({ canRequestReviews }: CanRequestReviewsEnv) => canRequestReviews(user))

export interface CanSeeReviewRequestsEnv {
  canSeeReviewRequests: (user?: User) => boolean
}

export const canSeeReviewRequests = (user?: User) =>
  R.asks(({ canSeeReviewRequests }: CanSeeReviewRequestsEnv) => canSeeReviewRequests(user))
