import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'

export interface GetAvatarEnv {
  getAvatar: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', URL>
}

export interface SaveAvatarEnv {
  saveAvatar: (
    orcid: Orcid,
    file: { buffer: Buffer; mimetype: 'image/avif' | 'image/heic' | 'image/jpeg' | 'image/png' | 'image/webp' },
  ) => TE.TaskEither<'unavailable', void>
}

export interface DeleteAvatarEnv {
  deleteAvatar: (orcid: Orcid) => TE.TaskEither<'unavailable', void>
}

export const getAvatar = (orcid: Orcid) =>
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
  orcid: Orcid,
  file: { buffer: Buffer; mimetype: 'image/avif' | 'image/heic' | 'image/jpeg' | 'image/png' | 'image/webp' },
) =>
  pipe(
    RTE.ask<SaveAvatarEnv>(),
    RTE.chainTaskEitherK(({ saveAvatar }) => saveAvatar(orcid, file)),
  )

export const deleteAvatar = (orcid: Orcid) =>
  pipe(
    RTE.ask<DeleteAvatarEnv>(),
    RTE.chainTaskEitherK(({ deleteAvatar }) => deleteAvatar(orcid)),
  )
