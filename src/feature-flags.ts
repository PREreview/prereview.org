import * as R from 'fp-ts/Reader'
import { User } from './user'

export interface CanAddAuthorsEnv {
  canAddAuthors: (user: User) => boolean
}

export const canAddAuthors = (user: User) => R.asks(({ canAddAuthors }: CanAddAuthorsEnv) => canAddAuthors(user))

export interface CanUseEditorToolbarEnv {
  canUseEditorToolbar: (user: User) => boolean
}

export const canUseEditorToolbar = (user: User) =>
  R.asks(({ canUseEditorToolbar }: CanUseEditorToolbarEnv) => canUseEditorToolbar(user))
