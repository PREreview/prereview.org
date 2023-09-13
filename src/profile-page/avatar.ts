import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import type { Orcid } from 'orcid-id-ts'

export interface GetAvatarEnv {
  getAvatar: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', URL>
}

export const getAvatar = (orcid: Orcid) =>
  pipe(
    RTE.ask<GetAvatarEnv>(),
    RTE.chainTaskEitherK(({ getAvatar }) => getAvatar(orcid)),
  )
