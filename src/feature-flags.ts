import * as R from 'fp-ts/Reader'
import { User } from './user'

export interface CanAddAuthorsEnv {
  canAddAuthors: (user: User) => boolean
}

export const canAddAuthors = (user: User) => R.asks(({ canAddAuthors }: CanAddAuthorsEnv) => canAddAuthors(user))
