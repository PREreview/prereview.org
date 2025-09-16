import { flow, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import { match } from 'ts-pattern'
import type { Orcid } from './types/Orcid.js'

export interface SlackUser {
  readonly name: string
  readonly image: URL
  readonly profile: URL
}

export interface IsSlackUserEnv {
  isSlackUser: (orcid: Orcid) => TE.TaskEither<'unavailable', boolean>
}

export interface GetSlackUserEnv {
  getSlackUser: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', SlackUser>
}

export const isSlackUser = (orcid: Orcid) =>
  pipe(
    RTE.ask<IsSlackUserEnv>(),
    RTE.chainTaskEitherK(({ isSlackUser }) => isSlackUser(orcid)),
  )

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
