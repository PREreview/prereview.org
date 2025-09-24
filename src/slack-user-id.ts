import { HashSet, pipe } from 'effect'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import * as C from 'io-ts/lib/Codec.js'
import { type NonEmptyString, NonEmptyStringC } from './types/NonEmptyString.ts'
import type { OrcidId } from './types/OrcidId.ts'

export interface SlackUserId {
  readonly accessToken: NonEmptyString
  readonly scopes: HashSet.HashSet<NonEmptyString>
  readonly userId: NonEmptyString
}

export interface GetSlackUserIdEnv {
  getSlackUserId: (orcid: OrcidId) => TE.TaskEither<'not-found' | 'unavailable', SlackUserId>
}

export interface EditSlackUserIdEnv {
  saveSlackUserId: (orcid: OrcidId, slackUserId: SlackUserId) => TE.TaskEither<'unavailable', void>
}

export interface DeleteSlackUserIdEnv {
  deleteSlackUserId: (orcid: OrcidId) => TE.TaskEither<'unavailable', void>
}

const HashSetC = <O, A>(item: C.Codec<unknown, O, A>) =>
  pipe(C.array(item), C.imap(HashSet.fromIterable, HashSet.toValues))

export const SlackUserIdC = C.struct({
  accessToken: NonEmptyStringC,
  scopes: HashSetC(NonEmptyStringC),
  userId: NonEmptyStringC,
}) satisfies C.Codec<unknown, unknown, SlackUserId>

export const getSlackUserId = (orcid: OrcidId) =>
  pipe(
    RTE.ask<GetSlackUserIdEnv>(),
    RTE.chainTaskEitherK(({ getSlackUserId }) => getSlackUserId(orcid)),
  )

export const saveSlackUserId = (
  orcid: OrcidId,
  slackUserId: SlackUserId,
): RTE.ReaderTaskEither<EditSlackUserIdEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ saveSlackUserId }) => saveSlackUserId(orcid, slackUserId)))

export const deleteSlackUserId = (orcid: OrcidId) =>
  pipe(
    RTE.ask<DeleteSlackUserIdEnv>(),
    RTE.chainTaskEitherK(({ deleteSlackUserId }) => deleteSlackUserId(orcid)),
  )
