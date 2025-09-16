import { flow, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import { match } from 'ts-pattern'
import type { OrcidId } from './types/OrcidId.js'

export interface SlackUser {
  readonly name: string
  readonly image: URL
  readonly profile: URL
}

export interface IsSlackUserEnv {
  isSlackUser: (orcid: OrcidId) => TE.TaskEither<'unavailable', boolean>
}

export interface GetSlackUserEnv {
  getSlackUser: (orcid: OrcidId) => TE.TaskEither<'not-found' | 'unavailable', SlackUser>
}

export const isSlackUser = (orcid: OrcidId) =>
  pipe(
    RTE.ask<IsSlackUserEnv>(),
    RTE.chainTaskEitherK(({ isSlackUser }) => isSlackUser(orcid)),
  )

export const getSlackUser = (orcid: OrcidId) =>
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
