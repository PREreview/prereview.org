import { flow, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import { match } from 'ts-pattern'
import type { OrcidId } from './types/OrcidId.js'

export interface GetAvatarEnv {
  getAvatar: (orcid: OrcidId) => TE.TaskEither<'not-found' | 'unavailable', URL>
}

export interface SaveAvatarEnv {
  saveAvatar: (
    orcid: OrcidId,
    file: { path: string; mimetype: 'image/avif' | 'image/heic' | 'image/jpeg' | 'image/png' | 'image/webp' },
  ) => TE.TaskEither<'unavailable', void>
}

export interface DeleteAvatarEnv {
  deleteAvatar: (orcid: OrcidId) => TE.TaskEither<'unavailable', void>
}

export const getAvatar = (orcid: OrcidId) =>
  pipe(
    RTE.ask<GetAvatarEnv>(),
    RTE.chainTaskEitherK(({ getAvatar }) => getAvatar(orcid)),
  )

export const maybeGetAvatar = flow(
  getAvatar,
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(undefined))
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)

export const saveAvatar = (
  orcid: OrcidId,
  file: { path: string; mimetype: 'image/avif' | 'image/heic' | 'image/jpeg' | 'image/png' | 'image/webp' },
) =>
  pipe(
    RTE.ask<SaveAvatarEnv>(),
    RTE.chainTaskEitherK(({ saveAvatar }) => saveAvatar(orcid, file)),
  )

export const deleteAvatar = (orcid: OrcidId) =>
  pipe(
    RTE.ask<DeleteAvatarEnv>(),
    RTE.chainTaskEitherK(({ deleteAvatar }) => deleteAvatar(orcid)),
  )
