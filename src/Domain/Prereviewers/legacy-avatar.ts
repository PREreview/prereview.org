import { flow, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import { match } from 'ts-pattern'
import type { OrcidId } from '../../types/OrcidId.ts'

export interface GetAvatarEnv {
  getAvatar: (orcid: OrcidId) => TE.TaskEither<'not-found' | 'unavailable', URL>
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
