import type { Ord } from 'fp-ts/lib/Ord.js'
import * as RTE from 'fp-ts/lib/ReaderTaskEither.js'
import * as RS from 'fp-ts/lib/ReadonlySet.js'
import type * as TE from 'fp-ts/lib/TaskEither.js'
import { pipe } from 'fp-ts/lib/function.js'
import * as C from 'io-ts/lib/Codec.js'
import type { Codec } from 'io-ts/lib/Codec.js'
import type { Orcid } from 'orcid-id-ts'
import { type NonEmptyString, NonEmptyStringC, ordNonEmptyString } from './types/string.js'

export interface SlackUserId {
  readonly accessToken: NonEmptyString
  readonly scopes: ReadonlySet<NonEmptyString>
  readonly userId: NonEmptyString
}

export interface GetSlackUserIdEnv {
  getSlackUserId: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', SlackUserId>
}

export interface EditSlackUserIdEnv {
  saveSlackUserId: (orcid: Orcid, slackUserId: SlackUserId) => TE.TaskEither<'unavailable', void>
}

export interface DeleteSlackUserIdEnv {
  deleteSlackUserId: (orcid: Orcid) => TE.TaskEither<'unavailable', void>
}

const ReadonlySetC = <O, A>(item: Codec<unknown, O, A>, ordItem: Ord<A>) =>
  pipe(C.array(item), C.readonly, C.imap(RS.fromReadonlyArray(ordItem), RS.toReadonlyArray(ordItem)))

export const SlackUserIdC = C.struct({
  accessToken: NonEmptyStringC,
  scopes: ReadonlySetC(NonEmptyStringC, ordNonEmptyString),
  userId: NonEmptyStringC,
}) satisfies C.Codec<unknown, unknown, SlackUserId>

export const getSlackUserId = (orcid: Orcid) =>
  pipe(
    RTE.ask<GetSlackUserIdEnv>(),
    RTE.chainTaskEitherK(({ getSlackUserId }) => getSlackUserId(orcid)),
  )

export const saveSlackUserId = (
  orcid: Orcid,
  slackUserId: SlackUserId,
): RTE.ReaderTaskEither<EditSlackUserIdEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ saveSlackUserId }) => saveSlackUserId(orcid, slackUserId)))

export const deleteSlackUserId = (orcid: Orcid) =>
  pipe(
    RTE.ask<DeleteSlackUserIdEnv>(),
    RTE.chainTaskEitherK(({ deleteSlackUserId }) => deleteSlackUserId(orcid)),
  )
