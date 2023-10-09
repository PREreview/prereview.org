import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import * as C from 'io-ts/Codec'
import type { Orcid } from 'orcid-id-ts'
import { type NonEmptyString, NonEmptyStringC } from './string'

export interface SlackUserId {
  readonly accessToken: NonEmptyString
  readonly userId: NonEmptyString
}

export interface GetSlackUserIdEnv {
  getSlackUserId: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', SlackUserId>
}

export interface EditSlackUserIdEnv {
  saveSlackUserId: (orcid: Orcid, slackUserId: SlackUserId) => TE.TaskEither<'unavailable', void>
}

export const SlackUserIdC = C.struct({
  accessToken: NonEmptyStringC,
  userId: NonEmptyStringC,
})

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
