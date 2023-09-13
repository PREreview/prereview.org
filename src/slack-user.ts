import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { flow, pipe } from 'fp-ts/function'
import type { Orcid } from 'orcid-id-ts'
import { match } from 'ts-pattern'

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

export const maybeGetSlackUser = flow(
  getSlackUser,
  RTE.orElseW(error =>
    match(error)
      .with('not-found', () => RTE.right(undefined))
      .with('unavailable', RTE.left)
      .exhaustive(),
  ),
)
