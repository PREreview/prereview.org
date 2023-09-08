import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import type { Orcid } from 'orcid-id-ts'

export interface SlackUser {
  readonly name: string
  readonly image: URL
  readonly profile: URL
}

export interface GetSlackUserEnv {
  getSlackUser: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', SlackUser>
}

export const getSlackUser = (orcid: Orcid) =>
  pipe(
    RTE.ask<GetSlackUserEnv>(),
    RTE.chainTaskEitherK(({ getSlackUser }) => getSlackUser(orcid)),
  )
