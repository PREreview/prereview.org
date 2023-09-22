import * as RTE from 'fp-ts/ReaderTaskEither'
import type * as TE from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'
import type { Orcid } from 'orcid-id-ts'
import type { NonEmptyString } from './string'

export interface GetSlackUserIdEnv {
  getSlackUserId: (orcid: Orcid) => TE.TaskEither<'not-found' | 'unavailable', NonEmptyString>
}

export interface EditSlackUserIdEnv {
  saveSlackUserId: (orcid: Orcid, slackUserId: NonEmptyString) => TE.TaskEither<'unavailable', void>
}

export const getSlackUserId = (orcid: Orcid) =>
  pipe(
    RTE.ask<GetSlackUserIdEnv>(),
    RTE.chainTaskEitherK(({ getSlackUserId }) => getSlackUserId(orcid)),
  )

export const saveSlackUserId = (
  orcid: Orcid,
  slackUserId: NonEmptyString,
): RTE.ReaderTaskEither<EditSlackUserIdEnv, 'unavailable', void> =>
  RTE.asksReaderTaskEither(RTE.fromTaskEitherK(({ saveSlackUserId }) => saveSlackUserId(orcid, slackUserId)))
